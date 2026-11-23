// Database tests: schema, RLS isolation and points rules, run against real Postgres.
// Creates a throwaway database, applies the Supabase shim + all migrations + seed, then drops it.
// DATABASE_URL must point at a server where we can create databases (default: local test server).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const ADMIN_URL = process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5433/postgres';
const DB = `cmind_test_${process.pid}`;

let admin: pg.Client;
let db: pg.Client;

// ---------- fixtures ----------
const U = Object.fromEntries(
  ['super', 'adminA', 'instA', 'instA2', 'stu1', 'stu2', 'stu3', 'parent1', 'adminB', 'instB', 'stuB'].map(k => [k, randomUUID()]),
) as Record<string, string>;
const S = { A: randomUUID(), B: randomUUID() };
const G = { A1: randomUUID(), A2: randomUUID(), B1: randomUUID() };
const A = {
  mcq: randomUUID(), mcqLate: randomUUID(), mcqClosed: randomUUID(),
  upload: randomUUID(), uploadLate: randomUUID(), mcqB: randomUUID(),
};
const lessons: Record<string, { id: string; type: string }[]> = {};

// ---------- helpers ----------
type Who = keyof typeof U | null;

/** Run SQL as a given user (or anon) inside a transaction, exactly like a PostgREST request. */
async function as<T = any>(who: Who, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query('begin');
  try {
    const claims = who ? { sub: U[who], role: 'authenticated' } : { role: 'anon' };
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    await db.query(`set local role ${who ? 'authenticated' : 'anon'}`);
    const res = await db.query(sql, params);
    await db.query('commit');
    return res.rows as T[];
  } catch (e) {
    await db.query('rollback');
    throw e;
  }
}
const one = async (who: Who, sql: string, params: unknown[] = []) => (await as(who, sql, params))[0];
const count = async (who: Who, sql: string, params: unknown[] = []) =>
  Number((await one(who, `select count(*)::int as n from (${sql}) x`, params)).n);
async function rejects(who: Who, sql: string, params: unknown[], code: string) {
  await assert.rejects(as(who, sql, params), (e: any) => {
    assert.equal(e.code, code, `expected SQLSTATE ${code}, got ${e.code}: ${e.message}`);
    return true;
  });
}
const points = async (student: keyof typeof U) =>
  Number((await db.query('select coalesce(sum(points),0)::int as p from point_events where student_id=$1 and revoked_at is null', [U[student]])).rows[0].p);
const sys = (sql: string, params: unknown[] = []) => db.query(sql, params);
const lesson = (track: string, type: string, nth = 0) => lessons[track].filter(l => l.type === type)[nth].id;

before(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${DB}`);
  await admin.query(`create database ${DB}`);
  const url = new URL(ADMIN_URL); url.pathname = `/${DB}`;
  db = new pg.Client({ connectionString: url.toString() });
  await db.connect();

  await db.query(readFileSync(join(here, '00_supabase_shim.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'migrations')).filter(f => f.endsWith('.sql')).sort()) {
    await db.query(readFileSync(join(root, 'migrations', f), 'utf8'));
  }
  await db.query(readFileSync(join(root, 'seed.sql'), 'utf8'));

  // Tenants, users, groups (as the database owner, like the API's service role would).
  await sys(`insert into schools (id, name, slug) values ($1,'Al Nour Academy','al-nour'), ($2,'Future School','future')`, [S.A, S.B]);
  const people: [string, string, string | null, string][] = [
    ['super', 'super_admin', null, 'CMind Staff'],
    ['adminA', 'school_admin', S.A, 'Admin A'], ['instA', 'instructor', S.A, 'Saber Mohammed'],
    ['instA2', 'instructor', S.A, 'Instructor Two'], ['stu1', 'student', S.A, 'Youssef Hany'],
    ['stu2', 'student', S.A, 'Nour Ibrahim'], ['stu3', 'student', S.A, 'Karim Mostafa'],
    ['parent1', 'parent', S.A, 'Hany Parent'], ['adminB', 'school_admin', S.B, 'Admin B'],
    ['instB', 'instructor', S.B, 'Instructor B'], ['stuB', 'student', S.B, 'Student B'],
  ];
  for (const [k, role, school, name] of people) {
    await sys('insert into auth.users (id, email) values ($1, $2)', [U[k], `${k}@test.cmind`]);
    await sys('insert into profiles (id, school_id, role, full_name) values ($1,$2,$3,$4)', [U[k], school, role, name]);
  }
  await sys(`insert into groups (id, school_id, name, grade, instructor_id) values
    ($1,$4,'Grade 5 - A','5',$5), ($2,$4,'Grade 6 - B','6',$6), ($3,$7,'Grade 5','5',$8)`,
    [G.A1, G.A2, G.B1, S.A, U.instA, U.instA2, S.B, U.instB]);
  await sys(`insert into group_members (group_id, student_id) values ($1,$2), ($1,$3), ($4,$5), ($6,$7)`,
    [G.A1, U.stu1, U.stu2, G.A2, U.stu3, G.B1, U.stuB]);
  await sys('insert into parent_links (parent_id, student_id) values ($1,$2)', [U.parent1, U.stu1]);
  await sys(`insert into group_tracks (group_id, track_id) select $1, id from tracks where slug='programming-foundation'`, [G.A1]);
  await sys(`insert into group_tracks (group_id, track_id) select $1, id from tracks where slug='ai-intro'`, [G.B1]);

  for (const r of (await sys(`select t.slug, l.id, l.type from lessons l join tracks t on t.id=l.track_id order by t.slug, l.position`)).rows) {
    (lessons[r.slug] ??= []).push({ id: r.id, type: r.type });
  }

  // Assignments in group A1 (pf assessment lesson linked to the main quiz).
  const future = "now() + interval '7 days'", past = "now() - interval '1 day'";
  await sys(`insert into assignments (id, group_id, lesson_id, created_by, title, type, due_at, allow_late) values
    ($1,$7,$8,$9,'Scratch Basics Quiz','mcq',${future},false),
    ($2,$7,null,$9,'Late quiz','mcq',${past},true),
    ($3,$7,null,$9,'Closed quiz','mcq',${past},false),
    ($4,$7,null,$9,'Ecosystems report','upload',${future},false),
    ($5,$7,null,$9,'Late report','upload',${past},true),
    ($6,$10,null,$11,'School B quiz','mcq',${future},false)`,
    [A.mcq, A.mcqLate, A.mcqClosed, A.upload, A.uploadLate, A.mcqB, G.A1, lesson('programming-foundation', 'assessment'), U.instA, G.B1, U.instB]);
  for (const [assignment, keys] of [[A.mcq, [1, 0]], [A.mcqLate, [2]], [A.mcqClosed, [0]], [A.mcqB, [0]]] as const) {
    for (const [i, k] of keys.entries()) {
      const q = (await sys(`insert into questions (assignment_id, position, prompt, options) values ($1,$2,'Q','["a","b","c"]') returning id`, [assignment, i])).rows[0].id;
      await sys('insert into question_keys (question_id, correct_index) values ($1,$2)', [q, k]);
    }
  }
});

after(async () => {
  await db?.end();
  await admin?.query(`drop database if exists ${DB}`);
  await admin?.end();
});

// ---------- access basics ----------
test('anonymous users can read and call nothing', async () => {
  await rejects(null, 'select * from tracks', [], '42501');
  await rejects(null, 'select * from profiles', [], '42501');
  await rejects(null, 'select open_lesson($1)', [lesson('programming-foundation', 'video')], '42501');
});

test('tenant isolation: no cross-school reads', async () => {
  assert.equal(await count('stu1', 'select * from profiles where school_id=$1', [S.B]), 0);
  assert.equal(await count('stu1', 'select * from schools'), 1);
  assert.equal(await count('adminA', 'select * from groups where school_id=$1', [S.B]), 0);
  assert.equal(await count('adminA', 'select * from assignments where school_id=$1', [S.B]), 0);
  assert.equal(await count('adminA', 'select * from profiles where school_id=$1', [S.B]), 0);
  assert.equal(await count('adminB', 'select * from profiles where school_id=$1', [S.A]), 0);
  assert.equal(await count('instB', 'select * from assignments where school_id=$1', [S.A]), 0);
  assert.equal(await count('super', 'select * from schools'), 2);
});

test('profile visibility inside a school', async () => {
  const seen = async (who: Who, k: string) => count(who, 'select * from profiles where id=$1', [U[k]]);
  assert.equal(await seen('stu1', 'stu2'), 1, 'classmate visible');
  assert.equal(await seen('stu1', 'instA'), 1, 'own instructor visible');
  assert.equal(await seen('stu1', 'stu3'), 0, 'student of another group hidden');
  assert.equal(await seen('stu1', 'instA2'), 0, 'other instructor hidden');
  assert.equal(await seen('stu1', 'adminA'), 0);
  assert.equal(await seen('parent1', 'stu1'), 1, 'parent sees child');
  assert.equal(await seen('parent1', 'instA'), 1, "parent sees child's instructor");
  assert.equal(await seen('parent1', 'stu2'), 0);
  assert.equal(await seen('instA', 'stu1'), 1);
  assert.equal(await seen('instA', 'stu3'), 0, 'instructor sees only own students');
  assert.equal(await seen('adminA', 'stu3'), 1);
});

test('users edit only safe columns of their own profile', async () => {
  await as('stu1', `update profiles set display_name='Yoyo' where id=$1`, [U.stu1]);
  assert.equal((await sys('select display_name from profiles where id=$1', [U.stu1])).rows[0].display_name, 'Yoyo');
  await rejects('stu1', `update profiles set role='school_admin' where id=$1`, [U.stu1], '42501');
  await rejects('stu1', `update profiles set school_id=$2 where id=$1`, [U.stu1, S.B], '42501');
  await as('stu1', `update profiles set display_name='Hacked' where id=$1`, [U.stu2]);
  assert.equal((await sys('select display_name from profiles where id=$1', [U.stu2])).rows[0].display_name, null);
});

test('students cannot write points, progress, badges or submissions directly', async () => {
  await rejects('stu1', `insert into point_events (school_id, student_id, points, reason, note) values ($1,$2,500,'admin_adjustment','free points')`, [S.A, U.stu1], '42501');
  await rejects('stu1', 'update point_events set points = 999', [], '42501');
  await rejects('stu1', 'delete from point_events', [], '42501');
  await rejects('stu1', 'insert into lesson_progress (student_id, lesson_id, school_id) values ($1,$2,$3)', [U.stu1, lesson('programming-foundation', 'video'), S.A], '42501');
  await rejects('stu1', `insert into student_badges (student_id, badge_key, school_id) values ($1,'champion',$2)`, [U.stu1, S.A], '42501');
  await rejects('stu1', `insert into submissions (school_id, assignment_id, student_id, status, score) values ($1,$2,$3,'graded',100)`, [S.A, A.mcq, U.stu1], '42501');
  await rejects('instA', `insert into point_events (school_id, student_id, points, reason, note) values ($1,$2,5,'admin_adjustment','x x x')`, [S.A, U.stu1], '42501');
});

test('curriculum: only super admin writes; unpublished tracks are hidden', async () => {
  await rejects('adminA', `insert into tracks (slug, name, name_ar) values ('hack','Hack','هاك')`, [], '42501');
  await as('super', `insert into tracks (slug, name, name_ar, is_published) values ('draft-track','Draft','مسودة',false)`);
  assert.equal(await count('super', `select * from tracks where slug='draft-track'`), 1);
  assert.equal(await count('adminA', `select * from tracks where slug='draft-track'`), 0);
  assert.equal(await count('adminA', 'select * from tracks'), 4, 'school staff see the published catalog');
  assert.equal(await count('stu1', 'select * from tracks'), 1, 'students see enrolled tracks only');
  assert.equal(await count('stuB', `select * from tracks where slug='ai-intro'`), 1);
});

// ---------- points: lessons ----------
test('opening lessons: +5 video, +5 article, once each', async () => {
  const video = lesson('programming-foundation', 'video');
  assert.equal((await one('stu1', 'select open_lesson($1) as p', [video])).p, 5);
  assert.equal((await one('stu1', 'select open_lesson($1) as p', [video])).p, 0, 'second open earns nothing');
  assert.equal((await one('stu1', 'select open_lesson($1) as p', [lesson('programming-foundation', 'article')])).p, 5);
  assert.equal((await one('stu1', 'select open_lesson($1) as p', [lesson('programming-foundation', 'assessment')])).p, 0);
  assert.equal(await points('stu1'), 10);
  assert.equal(await count('stu1', `select * from student_badges where badge_key='first_steps'`), 1);
  assert.equal((await one('stu1', 'select total_points from student_points where student_id=$1', [U.stu1])).total_points, 10);
});

test('opening lessons outside enrolled tracks or as non-student fails', async () => {
  await rejects('stu1', 'select open_lesson($1)', [lesson('ai-intro', 'video')], 'P0002');
  await rejects('stuB', 'select open_lesson($1)', [lesson('programming-foundation', 'video')], 'P0002');
  await rejects('instA', 'select open_lesson($1)', [lesson('programming-foundation', 'video')], '42501');
  await rejects('parent1', 'select open_lesson($1)', [lesson('programming-foundation', 'video')], '42501');
});

// ---------- points: assessments ----------
test('students never see MCQ answer keys', async () => {
  assert.equal(await count('stu1', 'select * from question_keys'), 0);
  assert.equal(await count('stu1', 'select * from questions where assignment_id=$1', [A.mcq]), 2);
  assert.equal(await count('instA', 'select * from question_keys'), 4, 'instructor sees keys of own groups');
  assert.equal(await count('instB', 'select * from question_keys'), 1);
});

test('MCQ full mark before deadline: auto-graded, +10 once', async () => {
  const before = await points('stu1');
  const s = await one('stu1', 'select * from submit_assignment($1, $2::jsonb)', [A.mcq, '[1,0]']);
  assert.equal(s.status, 'graded');
  assert.equal(s.score, 100);
  assert.equal(await points('stu1'), before + 10);
  assert.equal(await count('stu1', `select * from student_badges where badge_key='perfect_score'`), 1);
  await rejects('stu1', 'select submit_assignment($1, $2::jsonb)', [A.mcq, '[1,0]'], 'P0001');
  assert.equal(await points('stu1'), before + 10, 'no second award');
});

test('MCQ partial score earns no bonus; wrong answer count is rejected', async () => {
  await rejects('stu2', 'select submit_assignment($1, $2::jsonb)', [A.mcq, '[1]'], '22023');
  const s = await one('stu2', 'select * from submit_assignment($1, $2::jsonb)', [A.mcq, '[0,0]']);
  assert.equal(s.score, 50);
  assert.equal(await points('stu2'), 0);
});

test('late full mark earns no bonus; closed deadline rejects', async () => {
  const before = await points('stu1');
  const s = await one('stu1', 'select * from submit_assignment($1, $2::jsonb)', [A.mcqLate, '[2]']);
  assert.equal(s.score, 100);
  assert.equal(await points('stu1'), before, 'late submission: no bonus');
  await rejects('stu1', 'select submit_assignment($1, $2::jsonb)', [A.mcqClosed, '[0]'], 'P0001');
  await rejects('stuB', 'select submit_assignment($1, $2::jsonb)', [A.mcq, '[1,0]'], 'P0002');
});

test('upload graded 100 on time: +10 once; regrade below 100 revokes; back to 100 restores', async () => {
  await rejects('stu1', 'select submit_assignment($1, null, $2)', [A.upload, `${S.A}/${U.stu2}/${A.upload}/x.pdf`], '22023');
  const sub = await one('stu1', 'select * from submit_assignment($1, null, $2)', [A.upload, `${S.A}/${U.stu1}/${A.upload}/report.pdf`]);
  assert.equal(sub.status, 'submitted');
  const before = await points('stu1');

  assert.equal((await one('instA', 'select grade_submission($1, 100, $2) as p', [sub.id, 'Great work'])).p, 10);
  assert.equal((await one('instA', 'select grade_submission($1, 100) as p', [sub.id])).p, 0, 'no double award');
  assert.equal(await points('stu1'), before + 10);

  await one('instA', 'select grade_submission($1, 90) as p', [sub.id]);
  assert.equal(await points('stu1'), before, 'bonus revoked after regrade');
  assert.equal((await one('instA', 'select grade_submission($1, 100) as p', [sub.id])).p, 10, 'bonus restored');
  assert.equal(await points('stu1'), before + 10);
  assert.equal(Number((await sys(`select count(*) as n from point_events where ref_id=$1`, [sub.id])).rows[0].n), 1, 'still one ledger row');

  await rejects('instA2', 'select grade_submission($1, 50)', [sub.id], 'P0002');
  await rejects('stu1', 'select grade_submission($1, 100)', [sub.id], 'P0002');
  await rejects('instA', 'select grade_submission($1, 101)', [sub.id], '22023');
  assert.ok(await count('adminA', `select * from audit_logs where action='submission.graded' and entity_id=$1`, [sub.id]) >= 4);
});

test('late upload graded 100 earns no bonus', async () => {
  const sub = await one('stu2', 'select * from submit_assignment($1, null, $2)', [A.uploadLate, `${S.A}/${U.stu2}/${A.uploadLate}/r.pdf`]);
  assert.equal((await one('instA', 'select grade_submission($1, 100) as p', [sub.id])).p, 0);
});

test('submission visibility: own, group staff, parent only', async () => {
  assert.equal(await count('stu2', 'select * from submissions where student_id=$1', [U.stu1]), 0);
  assert.ok(await count('stu1', 'select * from submissions where student_id=$1', [U.stu1]) >= 3);
  assert.ok(await count('parent1', 'select * from submissions where student_id=$1', [U.stu1]) >= 3);
  assert.equal(await count('parent1', 'select * from submissions where student_id=$1', [U.stu2]), 0);
  assert.ok(await count('instA', 'select * from submissions where student_id=$1', [U.stu1]) >= 3);
  assert.equal(await count('instA2', 'select * from submissions where student_id=$1', [U.stu1]), 0);
  assert.equal(await count('adminB', 'select * from submissions'), 0);
});

// ---------- points: admin controls ----------
test('school admin adjusts and revokes points with a reason; others cannot', async () => {
  const before = await points('stu2');
  const id = (await one('adminA', `select adjust_points($1, 7, 'Helped classmates') as id`, [U.stu2])).id;
  assert.equal(await points('stu2'), before + 7);
  await rejects('adminA', `select adjust_points($1, 7, '')`, [U.stu2], '22023');
  await rejects('adminA', `select adjust_points($1, 0, 'no change')`, [U.stu2], '22023');
  await rejects('instA', `select adjust_points($1, 7, 'not allowed')`, [U.stu2], 'P0002');
  await rejects('adminB', `select adjust_points($1, 7, 'other school')`, [U.stu2], 'P0002');
  await rejects('stu2', `select adjust_points($1, 100, 'self award')`, [U.stu2], 'P0002');

  await one('adminA', `select revoke_point_event($1, 'Entered by mistake')`, [id]);
  assert.equal(await points('stu2'), before);
  await rejects('adminA', `select revoke_point_event($1, 'again')`, [id], 'P0001');
  assert.equal(await count('adminA', `select * from audit_logs where action in ('points.adjusted','points.revoked')`), 2);
  assert.equal(await count('adminB', `select * from audit_logs`), 0);
});

test('displayed points never go below zero', async () => {
  const id = (await one('adminA', `select adjust_points($1, -1000, 'Test floor') as id`, [U.stu3])).id;
  assert.equal((await one('adminA', 'select total_points from student_points where student_id=$1', [U.stu3])).total_points, 0);
  await one('adminA', `select revoke_point_event($1, 'Undo test')`, [id]);
});

test('point rules: school admin sets own school; values apply to new awards', async () => {
  await one('adminA', 'select set_point_rules(10, 8, 5)');
  await rejects('adminA', 'select set_point_rules(10, 8, 5, $1)', [S.B], '42501');
  await rejects('instA', 'select set_point_rules(10, 8, 5)', [], '42501');
  await rejects('adminA', 'select set_point_rules(10, -1, 5)', [], '22023');
  assert.equal((await one('stu2', 'select open_lesson($1) as p', [lesson('programming-foundation', 'video')])).p, 8);
  assert.equal((await one('stuB', 'select open_lesson($1) as p', [lesson('ai-intro', 'video')])).p, 5, 'school B keeps defaults');
  await one('super', 'select set_point_rules(10, 5, 5)');
  assert.equal(await count('stu1', 'select * from point_rules'), 2, 'sees default + own school rules');
});

test('completing every lesson of a track awards Track Finisher', async () => {
  for (const l of lessons['programming-foundation'].filter(l => l.type !== 'assessment')) {
    await one('stu2', 'select open_lesson($1)', [l.id]);
  }
  // stu2 already submitted the linked assessment (scored 50): submitting is what completes it.
  const tp = await one('stu2', `select * from track_progress where student_id=$1`, [U.stu2]);
  assert.equal(tp.completed_lessons, tp.total_lessons);
  assert.equal(await count('stu2', `select * from student_badges where badge_key='track_finisher'`), 1);
  assert.equal(await count('stu1', `select * from student_badges where student_id=$1`, [U.stu2]), 0, 'badges of others are private');
});

test('group leaderboard shows first names to members only', async () => {
  const rows = await as('stu1', 'select * from group_leaderboard($1)', [G.A1]);
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r: any) => !r.name.includes(' ')), 'first name or display name only');
  assert.ok(rows[0].points >= rows[1].points);
  await rejects('stu1', 'select * from group_leaderboard($1)', [G.A2], 'P0002');
  await rejects('stuB', 'select * from group_leaderboard($1)', [G.A1], 'P0002');
  assert.equal((await as('parent1', 'select * from group_leaderboard($1)', [G.A1])).length, 2);
});

// ---------- communication ----------
test('chat: members post in their group only; moderation hides messages', async () => {
  const msg = (await one('stu1', `insert into chat_messages (group_id, body) values ($1, 'Hello class') returning id`, [G.A1])).id;
  await rejects('stu1', `insert into chat_messages (group_id, body) values ($1, 'hi')`, [G.A2], '42501');
  await rejects('stu1', `insert into chat_messages (group_id, sender_id, body) values ($1, $2, 'spoof')`, [G.A1, U.stu2], '42501');
  assert.equal(await count('stu2', 'select * from chat_messages where id=$1', [msg]), 1);
  assert.equal(await count('stu3', 'select * from chat_messages where id=$1', [msg]), 0);
  await rejects('stu2', 'select delete_chat_message($1)', [msg], 'P0002');
  await one('instA', 'select delete_chat_message($1)', [msg]);
  assert.equal(await count('stu2', 'select * from chat_messages where id=$1', [msg]), 0, 'hidden from students');
  assert.equal(await count('instA', 'select * from chat_messages where id=$1', [msg]), 1, 'staff still see it');
});

test('news: school admin publishes for own school only', async () => {
  await as('adminA', `insert into news (school_id, title, body) values ($1, 'Demo Day', 'Friday at 10')`, [S.A]);
  await rejects('adminA', `insert into news (school_id, title, body) values ($1, 'Hack', 'x')`, [S.B], '42501');
  await rejects('instA', `insert into news (school_id, title, body) values ($1, 'Mine', 'x')`, [S.A], '42501');
  assert.equal(await count('stu1', 'select * from news'), 1);
  assert.equal(await count('stuB', 'select * from news'), 0);
});

// ---------- integrity ----------
test('integrity triggers block cross-school links', async () => {
  await rejects('adminA', 'insert into group_members (group_id, student_id) values ($1,$2)', [G.A1, U.stuB], '23514');
  await rejects('adminA', `insert into groups (school_id, name) values ($1, 'Sneaky')`, [S.B], '42501');
  await rejects('adminA', `insert into groups (school_id, name, instructor_id) values ($1, 'Wrong instructor', $2)`, [S.A, U.instB], '23514');
  await assert.rejects(sys(`update assignments set lesson_id=$1 where id=$2`, [lesson('programming-foundation', 'video'), A.upload]), (e: any) => e.code === '23514');
});

test('suspended school locks out all its users', async () => {
  await sys(`update schools set status='suspended' where id=$1`, [S.A]);
  try {
    assert.equal(await count('stu1', 'select * from assignments'), 0);
    assert.equal(await count('adminA', 'select * from profiles where school_id=$1 and id <> $2', [S.A, U.adminA]), 0);
    await rejects('stu1', 'select open_lesson($1)', [lesson('programming-foundation', 'video')], '42501');
  } finally {
    await sys(`update schools set status='active' where id=$1`, [S.A]);
  }
  assert.ok(await count('stu1', 'select * from assignments') > 0);
});

// ---------- storage ----------
test('storage: students upload only to their own submission folder', async () => {
  const ok = `${S.A}/${U.stu1}/${A.upload}/report-v2.pdf`;
  await as('stu1', `insert into storage.objects (bucket_id, name) values ('submissions', $1)`, [ok]);
  await rejects('stu1', `insert into storage.objects (bucket_id, name) values ('submissions', $1)`, [`${S.A}/${U.stu2}/${A.upload}/x.pdf`], '42501');
  await rejects('stu1', `insert into storage.objects (bucket_id, name) values ('submissions', $1)`, [`${S.A}/${U.stu1}/${A.mcq}/x.pdf`], '42501');
  await rejects('stu1', `insert into storage.objects (bucket_id, name) values ('submissions', $1)`, [`${S.A}/${U.stu1}/not-a-uuid/x.pdf`], '42501');
  await rejects('stuB', `insert into storage.objects (bucket_id, name) values ('submissions', $1)`, [`${S.B}/${U.stuB}/${A.upload}/x.pdf`], '42501');
  assert.equal(await count('instA', `select * from storage.objects where name=$1`, [ok]), 1);
  assert.equal(await count('parent1', `select * from storage.objects where name=$1`, [ok]), 1);
  assert.equal(await count('stu2', `select * from storage.objects where name=$1`, [ok]), 0);
  assert.equal(await count('stuB', `select * from storage.objects where name=$1`, [ok]), 0);
  await rejects('stu1', `insert into storage.objects (bucket_id, name) values ('lesson-assets', 'pf/x.mp4')`, [], '42501');
});

test('internal functions are not callable by API users', async () => {
  await rejects('stu1', `select private.award($1, $2, 1000, 'video_opened', $3)`, [U.stu1, S.A, randomUUID()], '42501');
  await rejects('adminA', 'select private.refresh_student_badges($1)', [U.stu1], '42501');
  await rejects('stu1', `select private.sync_full_mark_bonus($1)`, [randomUUID()], '42501');
});
