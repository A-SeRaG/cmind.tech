-- Demo curriculum for local and staging environments (from the web prototype).
-- Production curriculum is managed by super_admin in the app. Safe to re-run.

insert into public.tracks (slug, name, name_ar, description, icon, level, position, is_published) values ('programming-foundation', 'Programming Foundation', 'أساسيات البرمجة', 'Learn how computers follow instructions by building animations and games with Scratch.', '💻', 'Level 1', 1, true) on conflict (slug) do nothing;
insert into public.milestones (track_id, title, title_ar, description) select id, 'Final Project: Interactive Scratch Game', 'المشروع النهائي: لعبة سكراتش تفاعلية', 'Design and present a simple game with a score, at least one loop and one event.' from public.tracks where slug = 'programming-foundation' on conflict (track_id) do nothing;
insert into public.lessons (track_id, position, type, title, title_ar, summary, body, duration_min)
select t.id, v.position, v.type, v.title, v.title_ar, v.summary, v.body, v.duration_min
from public.tracks t, (values
  (0, 'video'::public.lesson_type, 'What is programming?', 'ما هي البرمجة؟', 'How computers follow step-by-step instructions, with everyday examples.', null, 6),
  (1, 'article'::public.lesson_type, 'Meet Scratch: blocks, sprites and the stage', 'تعرف على سكراتش', 'A tour of the Scratch editor.', 'Scratch is a visual programming language where you snap colorful blocks together instead of typing code. Every project has a stage (the background) and one or more sprites (the characters).

Blocks come in categories: Motion moves a sprite, Looks changes how it appears, Sound plays audio, and Events start your scripts, such as "when green flag clicked".

Try it: drag a "move 10 steps" block under a "when green flag clicked" block, then press the green flag. You just wrote your first program.', 8),
  (2, 'video'::public.lesson_type, 'Your first animation in Scratch', 'أول رسوم متحركة لك', 'Build a walking character using costumes and the repeat block.', null, 9),
  (3, 'article'::public.lesson_type, 'Loops: making code repeat', 'الحلقات التكرارية', 'Why loops save time.', 'A loop repeats a group of blocks. Instead of placing "move 10 steps" fifty times, you place it once inside "repeat 50".

Scratch has three loop blocks: repeat (a fixed number of times), forever (never stops until the project ends), and repeat until (stops when a condition becomes true).

Challenge: make a sprite draw a square using only four repeats of "move" and "turn 90 degrees".', 7),
  (4, 'assessment'::public.lesson_type, 'Scratch Basics Quiz', 'اختبار أساسيات سكراتش', 'Check your understanding of sprites, events and loops.', null, 15)
) as v(position, type, title, title_ar, summary, body, duration_min)
where t.slug = 'programming-foundation'
  and not exists (select 1 from public.lessons l where l.track_id = t.id);

insert into public.tracks (slug, name, name_ar, description, icon, level, position, is_published) values ('robotics-foundation', 'Robotics Foundation', 'أساسيات الروبوتات', 'Discover mechanics, circuits and sensors, then build and program your first robot.', '🤖', 'Level 1', 2, true) on conflict (slug) do nothing;
insert into public.milestones (track_id, title, title_ar, description) select id, 'Final Project: A Robot That Reacts', 'المشروع النهائي: روبوت يستجيب لبيئته', 'Build a robot that uses at least one sensor to change its behavior, and demo it live.' from public.tracks where slug = 'robotics-foundation' on conflict (track_id) do nothing;
insert into public.lessons (track_id, position, type, title, title_ar, summary, body, duration_min)
select t.id, v.position, v.type, v.title, v.title_ar, v.summary, v.body, v.duration_min
from public.tracks t, (values
  (0, 'video'::public.lesson_type, 'Simple machines: levers, gears and pulleys', 'الآلات البسيطة', 'How simple machines multiply force and change direction.', null, 8),
  (1, 'article'::public.lesson_type, 'Circuits 101: voltage, current and a battery', 'الدوائر الكهربائية', 'The basics of electricity.', 'A circuit is a closed loop that lets electricity flow from a battery, through components, and back again. If the loop is broken, nothing works, which is exactly how a switch turns a light off.

Voltage is the push that moves the electricity, current is the amount that flows, and resistance is how much a component slows it down.

Safety note: only use low-voltage batteries in class, and never connect a wire directly from one battery terminal to the other.', 8),
  (2, 'video'::public.lesson_type, 'Build and program your first robot', 'ابنِ أول روبوت', 'Assemble a motorized model and make it move with blocks.', null, 12),
  (3, 'article'::public.lesson_type, 'Sensors: how robots see the world', 'الحساسات', 'Distance, motion and light sensors.', 'Sensors give a robot information about its surroundings. A distance sensor measures how far away an object is, a light sensor measures brightness, and a tilt sensor detects angle.

A robot combines sensors with decisions: "if distance is less than 10 cm, stop". This if-then thinking is the core of how autonomous robots behave.', 7),
  (4, 'assessment'::public.lesson_type, 'Robotics Fundamentals Quiz', 'اختبار أساسيات الروبوتات', 'Test your knowledge of machines, circuits and sensors.', null, 15)
) as v(position, type, title, title_ar, summary, body, duration_min)
where t.slug = 'robotics-foundation'
  and not exists (select 1 from public.lessons l where l.track_id = t.id);

insert into public.tracks (slug, name, name_ar, description, icon, level, position, is_published) values ('ai-intro', 'Introduction to AI', 'مقدمة في الذكاء الاصطناعي', 'Understand how machines learn from data, and train a simple model yourself.', '🧠', 'All Levels', 3, true) on conflict (slug) do nothing;
insert into public.milestones (track_id, title, title_ar, description) select id, 'Final Project: Present Your Classifier', 'المشروع النهائي: اعرض مصنّفك', 'Train a small image classifier, test it, and explain one limitation and one ethical consideration.' from public.tracks where slug = 'ai-intro' on conflict (track_id) do nothing;
insert into public.lessons (track_id, position, type, title, title_ar, summary, body, duration_min)
select t.id, v.position, v.type, v.title, v.title_ar, v.summary, v.body, v.duration_min
from public.tracks t, (values
  (0, 'video'::public.lesson_type, 'What is AI? Real-world examples', 'ما هو الذكاء الاصطناعي؟', 'Voice assistants, recommendations and image recognition explained simply.', null, 7),
  (1, 'article'::public.lesson_type, 'How machines learn from data', 'كيف تتعلم الآلات من البيانات', 'Training, examples and predictions.', 'Traditional programs follow rules written by a person. A machine learning model instead finds the rules by itself by studying many examples.

To teach a model to recognize cats, you show it thousands of labeled photos. During training it adjusts itself until its guesses match the labels. Afterwards it can make predictions on photos it has never seen.

The quality of the data matters: a model trained on poor or one-sided examples will make poor or unfair predictions.', 9),
  (2, 'video'::public.lesson_type, 'Train an image classifier', 'درّب مصنّف صور', 'Collect examples, train, and test a simple image model in the browser.', null, 12),
  (3, 'article'::public.lesson_type, 'AI ethics: fairness and privacy', 'أخلاقيات الذكاء الاصطناعي', 'Using AI responsibly.', 'AI systems can be unfair when the data they learn from is unfair. For example, a face recognition model trained mostly on one group of people may work badly for others.

Privacy matters too: photos, voices and messages are personal data. Always ask permission before using someone else''s data, and think about who could be affected by your project.', 8),
  (4, 'assessment'::public.lesson_type, 'AI Concepts Quiz', 'اختبار مفاهيم الذكاء الاصطناعي', 'Check what you learned about data, training and ethics.', null, 15)
) as v(position, type, title, title_ar, summary, body, duration_min)
where t.slug = 'ai-intro'
  and not exists (select 1 from public.lessons l where l.track_id = t.id);

insert into public.tracks (slug, name, name_ar, description, icon, level, position, is_published) values ('critical-thinking', 'Critical Thinking & Chess', 'التفكير النقدي والشطرنج', 'Build planning and decision-making skills through chess and structured problem solving.', '♟️', 'All Levels', 4, true) on conflict (slug) do nothing;
insert into public.milestones (track_id, title, title_ar, description) select id, 'Final Milestone: Explain Your Game', 'الإنجاز النهائي: اشرح مباراتك', 'Play a full game and explain three key decisions you made and why.' from public.tracks where slug = 'critical-thinking' on conflict (track_id) do nothing;
insert into public.lessons (track_id, position, type, title, title_ar, summary, body, duration_min)
select t.id, v.position, v.type, v.title, v.title_ar, v.summary, v.body, v.duration_min
from public.tracks t, (values
  (0, 'video'::public.lesson_type, 'Chess basics: the board and the pieces', 'أساسيات الشطرنج', 'How each piece moves, captures and what checkmate means.', null, 9),
  (1, 'article'::public.lesson_type, 'Opening principles: control the center', 'مبادئ الافتتاح', 'Three rules for strong starts.', 'Good openings follow three ideas: control the center squares, develop your knights and bishops early, and keep your king safe, usually by castling.

Avoid moving the same piece twice in the opening, and avoid bringing your queen out too early, where it can be chased by smaller pieces.', 7),
  (2, 'video'::public.lesson_type, 'Tactics: forks and pins', 'التكتيكات: الشوكة والتثبيت', 'Spot two common tactics that win material.', null, 10),
  (3, 'article'::public.lesson_type, 'A problem-solving checklist', 'قائمة حل المشكلات', 'A habit you can use in chess and in class.', 'Before every decision, ask four questions: What is my opponent threatening? What are my options? What could go wrong with each option? Which option gives me the best result?

The same checklist works for math problems, group projects and everyday choices. Slowing down for ten seconds prevents most mistakes.', 6),
  (4, 'assessment'::public.lesson_type, 'Chess Tactics Quiz', 'اختبار تكتيكات الشطرنج', 'Find the best move in short positions.', null, 15)
) as v(position, type, title, title_ar, summary, body, duration_min)
where t.slug = 'critical-thinking'
  and not exists (select 1 from public.lessons l where l.track_id = t.id);
