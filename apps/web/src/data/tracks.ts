import type { Track } from '@/types/gamification';

const L = (
  id: string, type: 'video' | 'article' | 'assessment', title: string, titleAr: string,
  durationMin: number, summary: string, extra: { body?: string; assignmentId?: string } = {}
) => ({ id, type, title, titleAr, durationMin, summary, ...extra });

export const mockTracks: Track[] = [
  {
    id: 'programming-foundation', icon: '💻', level: 'Level 1',
    name: 'Programming Foundation', nameAr: 'أساسيات البرمجة',
    description: 'Learn how computers follow instructions by building animations and games with Scratch.',
    lessons: [
      L('pf-1', 'video', 'What is programming?', 'ما هي البرمجة؟', 6, 'How computers follow step-by-step instructions, with everyday examples.'),
      L('pf-2', 'article', 'Meet Scratch: blocks, sprites and the stage', 'تعرف على سكراتش', 8, 'A tour of the Scratch editor.', {
        body: 'Scratch is a visual programming language where you snap colorful blocks together instead of typing code. Every project has a stage (the background) and one or more sprites (the characters).\n\nBlocks come in categories: Motion moves a sprite, Looks changes how it appears, Sound plays audio, and Events start your scripts, such as "when green flag clicked".\n\nTry it: drag a "move 10 steps" block under a "when green flag clicked" block, then press the green flag. You just wrote your first program.'
      }),
      L('pf-3', 'video', 'Your first animation in Scratch', 'أول رسوم متحركة لك', 9, 'Build a walking character using costumes and the repeat block.'),
      L('pf-4', 'article', 'Loops: making code repeat', 'الحلقات التكرارية', 7, 'Why loops save time.', {
        body: 'A loop repeats a group of blocks. Instead of placing "move 10 steps" fifty times, you place it once inside "repeat 50".\n\nScratch has three loop blocks: repeat (a fixed number of times), forever (never stops until the project ends), and repeat until (stops when a condition becomes true).\n\nChallenge: make a sprite draw a square using only four repeats of "move" and "turn 90 degrees".'
      }),
      L('pf-5', 'assessment', 'Scratch Basics Quiz', 'اختبار أساسيات سكراتش', 15, 'Check your understanding of sprites, events and loops.', { assignmentId: 'a-scratch' }),
    ],
    milestone: { title: 'Final Project: Interactive Scratch Game', titleAr: 'المشروع النهائي: لعبة سكراتش تفاعلية', description: 'Design and present a simple game with a score, at least one loop and one event.' },
  },
  {
    id: 'robotics-foundation', icon: '🤖', level: 'Level 1',
    name: 'Robotics Foundation', nameAr: 'أساسيات الروبوتات',
    description: 'Discover mechanics, circuits and sensors, then build and program your first robot.',
    lessons: [
      L('rf-1', 'video', 'Simple machines: levers, gears and pulleys', 'الآلات البسيطة', 8, 'How simple machines multiply force and change direction.'),
      L('rf-2', 'article', 'Circuits 101: voltage, current and a battery', 'الدوائر الكهربائية', 8, 'The basics of electricity.', {
        body: 'A circuit is a closed loop that lets electricity flow from a battery, through components, and back again. If the loop is broken, nothing works, which is exactly how a switch turns a light off.\n\nVoltage is the push that moves the electricity, current is the amount that flows, and resistance is how much a component slows it down.\n\nSafety note: only use low-voltage batteries in class, and never connect a wire directly from one battery terminal to the other.'
      }),
      L('rf-3', 'video', 'Build and program your first robot', 'ابنِ أول روبوت', 12, 'Assemble a motorized model and make it move with blocks.'),
      L('rf-4', 'article', 'Sensors: how robots see the world', 'الحساسات', 7, 'Distance, motion and light sensors.', {
        body: 'Sensors give a robot information about its surroundings. A distance sensor measures how far away an object is, a light sensor measures brightness, and a tilt sensor detects angle.\n\nA robot combines sensors with decisions: "if distance is less than 10 cm, stop". This if-then thinking is the core of how autonomous robots behave.'
      }),
      L('rf-5', 'assessment', 'Robotics Fundamentals Quiz', 'اختبار أساسيات الروبوتات', 15, 'Test your knowledge of machines, circuits and sensors.', { assignmentId: 'a-robotics' }),
    ],
    milestone: { title: 'Final Project: A Robot That Reacts', titleAr: 'المشروع النهائي: روبوت يستجيب لبيئته', description: 'Build a robot that uses at least one sensor to change its behavior, and demo it live.' },
  },
  {
    id: 'ai-intro', icon: '🧠', level: 'All Levels',
    name: 'Introduction to AI', nameAr: 'مقدمة في الذكاء الاصطناعي',
    description: 'Understand how machines learn from data, and train a simple model yourself.',
    lessons: [
      L('ai-1', 'video', 'What is AI? Real-world examples', 'ما هو الذكاء الاصطناعي؟', 7, 'Voice assistants, recommendations and image recognition explained simply.'),
      L('ai-2', 'article', 'How machines learn from data', 'كيف تتعلم الآلات من البيانات', 9, 'Training, examples and predictions.', {
        body: 'Traditional programs follow rules written by a person. A machine learning model instead finds the rules by itself by studying many examples.\n\nTo teach a model to recognize cats, you show it thousands of labeled photos. During training it adjusts itself until its guesses match the labels. Afterwards it can make predictions on photos it has never seen.\n\nThe quality of the data matters: a model trained on poor or one-sided examples will make poor or unfair predictions.'
      }),
      L('ai-3', 'video', 'Train an image classifier', 'درّب مصنّف صور', 12, 'Collect examples, train, and test a simple image model in the browser.'),
      L('ai-4', 'article', 'AI ethics: fairness and privacy', 'أخلاقيات الذكاء الاصطناعي', 8, 'Using AI responsibly.', {
        body: 'AI systems can be unfair when the data they learn from is unfair. For example, a face recognition model trained mostly on one group of people may work badly for others.\n\nPrivacy matters too: photos, voices and messages are personal data. Always ask permission before using someone else\'s data, and think about who could be affected by your project.'
      }),
      L('ai-5', 'assessment', 'AI Concepts Quiz', 'اختبار مفاهيم الذكاء الاصطناعي', 15, 'Check what you learned about data, training and ethics.', { assignmentId: 'a-ai' }),
    ],
    milestone: { title: 'Final Project: Present Your Classifier', titleAr: 'المشروع النهائي: اعرض مصنّفك', description: 'Train a small image classifier, test it, and explain one limitation and one ethical consideration.' },
  },
  {
    id: 'critical-thinking', icon: '♟️', level: 'All Levels',
    name: 'Critical Thinking & Chess', nameAr: 'التفكير النقدي والشطرنج',
    description: 'Build planning and decision-making skills through chess and structured problem solving.',
    lessons: [
      L('ct-1', 'video', 'Chess basics: the board and the pieces', 'أساسيات الشطرنج', 9, 'How each piece moves, captures and what checkmate means.'),
      L('ct-2', 'article', 'Opening principles: control the center', 'مبادئ الافتتاح', 7, 'Three rules for strong starts.', {
        body: 'Good openings follow three ideas: control the center squares, develop your knights and bishops early, and keep your king safe, usually by castling.\n\nAvoid moving the same piece twice in the opening, and avoid bringing your queen out too early, where it can be chased by smaller pieces.'
      }),
      L('ct-3', 'video', 'Tactics: forks and pins', 'التكتيكات: الشوكة والتثبيت', 10, 'Spot two common tactics that win material.'),
      L('ct-4', 'article', 'A problem-solving checklist', 'قائمة حل المشكلات', 6, 'A habit you can use in chess and in class.', {
        body: 'Before every decision, ask four questions: What is my opponent threatening? What are my options? What could go wrong with each option? Which option gives me the best result?\n\nThe same checklist works for math problems, group projects and everyday choices. Slowing down for ten seconds prevents most mistakes.'
      }),
      L('ct-5', 'assessment', 'Chess Tactics Quiz', 'اختبار تكتيكات الشطرنج', 15, 'Find the best move in short positions.', { assignmentId: 'a-chess' }),
    ],
    milestone: { title: 'Final Milestone: Explain Your Game', titleAr: 'الإنجاز النهائي: اشرح مباراتك', description: 'Play a full game and explain three key decisions you made and why.' },
  },
];
