/* ============================================================
   cards.js  -  the task cards
   ------------------------------------------------------------
   ADDING A CARD: copy a line and change it.

       { text: 'Homework due 8am tomorrow',
         theme: 'school', box: 'now', tier: 1,
         why: 'Important, and due before school.' },

   theme is WHERE you are. Each level is one place, and only that
   place's cards turn up:

     theme: 'house'    at home - chores, cooking, family
     theme: 'school'   lessons, homework, tests, group work
     theme: 'phone'    messages, apps, scrolling
     theme: 'out'      buses, shops, friends, errands

   box must be one of:  'now'  'later'  'give'  'drop'

   tier is how hard the card is to judge:

     tier: 1   obvious at a glance      - Level 1 only uses these
     tier: 2   needs a moment of thought
     tier: 3   has a tempting wrong answer

   THE FAIR CARD RULE (read this before writing any card):
   A card must have ONE right answer. Give it a deadline AND
   the stakes, so the player is judging, not guessing.

     BAD   'Essay'                      - could be any box
     GOOD  'Essay due in 2 weeks, 20%'  - clearly Do Later

   THE EVERYDAY RULE:
   A card must be something MOST people actually do in a normal
   week. If only a few people would ever meet this task, cut it.
   The player has to recognise their own life on the card, or the
   lesson does not land.

     BAD   'Book the school hall before 5pm'   - almost nobody
     GOOD  'Learn 10 new words for the test'   - everybody

   THE THEME RULE:
   A card has to belong to its place. A house card should be
   something you do while standing in your house. If you could
   move it to another theme without noticing, it is too vague.

   HOW MANY: 116 cards.
     house    32  (8 in each of the four corners)
     school   28  (7 in each of the four corners)
     phone    28
     out      28
   Keep the corners inside a theme the same size as each other, or
   one corner starts repeating before the others do.

   APOSTROPHES ARE FINE - put the card in DOUBLE quotes when you need
   one: "it is your brother's turn". The old rule banned them outright,
   because an apostrophe ends a single-quoted string and breaks the
   game, and the cost was cards like 'your brother turn' and 'today
   notes' going out in broken English. Swapping the quotes costs
   nothing and buys back the grammar.

   If you cannot write a reason that convinces you, cut the card.
   ============================================================ */

var CARDS = [

  /* ############################################################
     THEME: HOUSE  -  Level 1, the lesson level
     All easy, all four corners. Nothing here should make anyone
     hesitate; the point is learning what the corners mean.
     ############################################################ */

  /* ---------- house: DO NOW ---------- */
  { text: 'Pot boiling over on the stove', theme: 'house', box: 'now', tier: 1,
    why: 'Seconds matter. Nothing else is close.' },
  { text: 'Stove still on and you are leaving', theme: 'house', box: 'now', tier: 1,
    why: 'Nothing on this screen matters more.' },
  { text: 'Rain starting, and you are the only one home', theme: 'house', box: 'now', tier: 1,
    why: 'Two minutes now, or the whole load done again.' },
  { text: 'Pet bowl empty and nobody else is up', theme: 'house', box: 'now', tier: 1,
    why: 'They cannot fix it themselves, and there is no one else.' },
  { text: 'Tap left running in the bathroom', theme: 'house', box: 'now', tier: 1,
    why: 'Every second you wait is water and money gone.' },
  { text: 'Front door left wide open', theme: 'house', box: 'now', tier: 1,
    why: 'Small job, and it is the whole house at risk.' },
  { text: "Milk spilled and your sister is about to walk through it", theme: 'house', box: 'now', tier: 1,
    why: 'Somebody else being there does not make it their mess.' },
  { text: 'Someone at the door, only you are home', theme: 'house', box: 'now', tier: 1,
    why: 'Nobody else can answer it. That makes it yours.' },

  /* ---------- house: DO LATER ---------- */
  { text: 'Sleep earlier tonight, tired every day', theme: 'house', box: 'later', tier: 1,
    why: 'No deadline, but it quietly ruins everything else.' },
  { text: 'Tidy your room before it gets unusable', theme: 'house', box: 'later', tier: 1,
    why: 'Ten minutes now beats an hour hunting for things.' },
  { text: 'Everyone your age can cook, you cannot', theme: 'house', box: 'later', tier: 1,
    why: 'Useless today, useful for the rest of your life.' },
  { text: 'Wash your pillowcase, skin breaking out', theme: 'house', box: 'later', tier: 1,
    why: 'Boring, cheap, and it actually works.' },
  { text: 'Clean your water bottle properly', theme: 'house', box: 'later', tier: 1,
    why: 'Nobody reminds you, and it gets worse every day.' },
  { text: 'Mum mentioned your sheets a month ago', theme: 'house', box: 'later', tier: 1,
    why: 'Nothing happens if you skip it. That is the trap.' },
  { text: 'Sort the clothes piled on your chair', theme: 'house', box: 'later', tier: 1,
    why: 'The pile never shrinks on its own.' },
  { text: 'Water the plants sometime this week', theme: 'house', box: 'later', tier: 1,
    why: 'Not today, but do not leave it till they droop.' },

  /* ---------- house: GIVE AWAY ----------
     Every one of these names the person who should do it instead, and
     says why they are the better choice - already in the room, already
     going that way, or it is simply their turn. Give Away is the corner
     people find hardest, so at home, on the easiest level, it is never
     a guess about WHO. */
  { text: "Dishes needed now, it is your brother's turn", theme: 'house', box: 'give', tier: 1,
    why: 'Urgent, but it is not yours. Hand it back.' },
  { text: 'Bin out tonight, brother is going out anyway', theme: 'house', box: 'give', tier: 1,
    why: 'Same trip, no extra effort. Ask.' },
  { text: 'Dog needs feeding, sister is next to the bowl', theme: 'house', box: 'give', tier: 1,
    why: 'Urgent and two steps away from someone else.' },
  { text: 'Parcel arrives at 2pm, dad is home all day', theme: 'house', box: 'give', tier: 1,
    why: 'Someone has to be there. It does not have to be you.' },
  { text: 'Table needs wiping for dinner, sister is free', theme: 'house', box: 'give', tier: 1,
    why: 'Urgent, tiny, and spare hands are right there.' },
  { text: 'Doorbell going and you are in the shower', theme: 'house', box: 'give', tier: 1,
    why: 'It must happen now, and you physically cannot.' },
  { text: 'Laundry needs switching, dad is in that room', theme: 'house', box: 'give', tier: 1,
    why: 'Urgent, and he is standing right next to it.' },
  { text: 'Plants need watering, your sister does them', theme: 'house', box: 'give', tier: 1,
    why: 'Urgent today, but it is her job and she knows how.' },

  /* ---------- house: DROP ---------- */
  { text: 'Rewatch a show you have seen', theme: 'house', box: 'drop', tier: 1,
    why: 'You know every line already. Nothing is waiting on it.' },
  { text: 'Scroll your feed one more time', theme: 'house', box: 'drop', tier: 1,
    why: 'Pure time sink. Nothing is waiting on it.' },
  { text: 'Check the fridge again, nothing changed', theme: 'house', box: 'drop', tier: 1,
    why: 'You looked four minutes ago. It is the same fridge.' },
  { text: 'Watch a stranger unbox a parcel', theme: 'house', box: 'drop', tier: 1,
    why: 'Their parcel, their day, and nothing for you to do.' },
  { text: 'Watch a video you already saw yesterday', theme: 'house', box: 'drop', tier: 1,
    why: 'You know how it ends. Move on.' },
  { text: 'Keep watching a show you stopped liking', theme: 'house', box: 'drop', tier: 1,
    why: 'You are bored and nothing is waiting on it. Stop.' },
  { text: 'Read the comments under a video', theme: 'house', box: 'drop', tier: 1,
    why: 'You will not remember one of them tomorrow.' },
  { text: 'Lie in bed deciding whether to get up', theme: 'house', box: 'drop', tier: 1,
    why: 'Not resting and not doing anything. Pick one.' },

  /* ############################################################
     THEME: SCHOOL  -  Level 2
     Four corners now. Easy and medium cards.
     ############################################################ */

  /* ---------- school: DO NOW ---------- */
  { text: 'Homework due 8am tomorrow', theme: 'school', box: 'now', tier: 1,
    why: 'Important, and the deadline is before school.' },
  { text: 'Everyone else revised, your test is tomorrow', theme: 'school', box: 'now', tier: 1,
    why: 'Nobody can sit it for you. Tonight is all there is.' },
  { text: 'Skipped breakfast, dizzy in class', theme: 'school', box: 'now', tier: 1,
    why: 'Your body is the deadline. Eat something.' },
  { text: 'Meeting your group at 4, it is 3:50', theme: 'school', box: 'now', tier: 1,
    why: 'Five people wait if you do not leave right now.' },
  { text: 'Presentation in 1 hour, your slide is blank', theme: 'school', box: 'now', tier: 2,
    why: 'Your group is counting on it and the clock is short.' },
  { text: 'Your essay is unsaved, laptop at 2%', theme: 'school', box: 'now', tier: 2,
    why: 'Two minutes from losing everything, and only you can press save.' },
  { text: 'PE next lesson, kit still at home', theme: 'school', box: 'now', tier: 2,
    why: 'One phone call now, or you sit out the whole lesson.' },

  /* ---------- school: DO LATER ---------- */
  { text: 'Learn 10 new words, test next month', theme: 'school', box: 'later', tier: 1,
    why: 'Ten a day is easy. A hundred the night before is not.' },
  { text: 'Your friends started revising, exam in 3 weeks', theme: 'school', box: 'later', tier: 1,
    why: 'The classic trap. Never urgent until it is a crisis.' },
  { text: 'Project due in 2 weeks, 20% of your grade', theme: 'school', box: 'later', tier: 1,
    why: 'Big for your grade, but you have time. Plan it in.' },
  { text: 'Teacher set a book for next month', theme: 'school', box: 'later', tier: 1,
    why: 'Important, no rush yet. Start early or regret it.' },
  { text: 'Ask the teacher what you missed last week', theme: 'school', box: 'later', tier: 2,
    why: 'The gap does not close on its own. It grows.' },
  { text: 'Sort your school files before exams', theme: 'school', box: 'later', tier: 2,
    why: 'Do it now or lose a whole revision day to searching.' },
  { text: 'Eyes checked, squinting at the board', theme: 'school', box: 'later', tier: 2,
    why: 'Every day you wait is a day you cannot read the lesson.' },

  /* ---------- school: GIVE AWAY ---------- */
  { text: "Class chat needs today's homework list", theme: 'school', box: 'give', tier: 1,
    why: 'Quick, urgent, and anyone in the class can post it.' },
  { text: 'Lost property desk shuts at 4, you are in class', theme: 'school', box: 'give', tier: 1,
    why: 'It has to be today, and you physically cannot get there.' },
  { text: 'Save seats at lunch, friends already there', theme: 'school', box: 'give', tier: 1,
    why: 'They are in the room. You are not.' },
  { text: 'Slides need printing, Mia has a printer', theme: 'school', box: 'give', tier: 2,
    why: 'Urgent, but she can do it in a minute and you cannot.' },
  { text: 'Class needs someone to collect the forms', theme: 'school', box: 'give', tier: 2,
    why: 'Urgent, and it is a job for whoever is nearest.' },
  { text: 'Someone must tell the teacher you are late', theme: 'school', box: 'give', tier: 2,
    why: 'Urgent, one message, and anyone can send it.' },
  { text: 'Notes need photocopying before next class', theme: 'school', box: 'give', tier: 2,
    why: 'Urgent, mechanical, and it does not have to be done by you.' },

  /* ---------- school: DROP ---------- */
  { text: 'Retake the same selfie for the tenth time', theme: 'school', box: 'drop', tier: 1,
    why: 'Fake productivity. It looks like a task but it is not.' },
  { text: 'Argue with someone online about nothing', theme: 'school', box: 'drop', tier: 1,
    why: 'Costs an hour, changes nobody, including them.' },
  { text: 'Doodle while the teacher is explaining', theme: 'school', box: 'drop', tier: 1,
    why: 'Fine in a break. Not while the thing you need is being said.' },
  { text: 'Compare your marks with everyone else', theme: 'school', box: 'drop', tier: 2,
    why: 'Their score does not change yours. Only studying does.' },
  { text: 'Argue about a game rule that does not matter', theme: 'school', box: 'drop', tier: 2,
    why: 'Nobody wins and the match does not change.' },
  { text: 'Copy out notes in nicer handwriting', theme: 'school', box: 'drop', tier: 2,
    why: 'Feels like revision. You are not learning anything.' },
  { text: 'Redo your profile picture for the third time', theme: 'school', box: 'drop', tier: 2,
    why: 'Nobody noticed the first two.' },

  /* ############################################################
     THEME: PHONE  -  Level 3
     Every difficulty. The hardest theme to judge, because almost
     everything on a phone FEELS urgent.
     ############################################################ */

  /* ---------- phone: DO NOW ---------- */
  { text: 'Login code expires in 60 seconds', theme: 'phone', box: 'now', tier: 1,
    why: 'A real deadline, and it is one minute long.' },
  { text: 'Phone at 3%, going out in 20 minutes', theme: 'phone', box: 'now', tier: 2,
    why: 'Tiny job now, a real problem the moment you leave.' },
  { text: 'Friend texted "emergency, call me"', theme: 'phone', box: 'now', tier: 2,
    why: 'You do not know yet, so find out. Now.' },
  { text: 'Mum has called four times, no message', theme: 'phone', box: 'now', tier: 2,
    why: 'Four calls is not a chat. Something is wrong.' },
  { text: 'Your phone is full, photos will not save', theme: 'phone', box: 'now', tier: 2,
    why: 'Nothing saves at all until you clear some. It only gets worse.' },
  { text: 'Online form closes at midnight tonight', theme: 'phone', box: 'now', tier: 3,
    why: 'It says tonight, so it is today. No second chance.' },
  { text: 'Backup code shown once, save it now', theme: 'phone', box: 'now', tier: 3,
    why: 'Looks like a settings fiddle. You get one chance at it.' },

  /* ---------- phone: DO LATER ---------- */
  { text: 'Back up your photos before the phone dies', theme: 'phone', box: 'later', tier: 2,
    why: 'Five minutes today, or lose the lot the day it goes.' },
  { text: 'Three people know your password, change it', theme: 'phone', box: 'later', tier: 2,
    why: 'Fine until the day it is very much not fine.' },
  { text: 'Back up your schoolwork somewhere else', theme: 'phone', box: 'later', tier: 2,
    why: 'Costs nothing today, saves a term if the laptop dies.' },
  { text: 'Update the app that keeps crashing', theme: 'phone', box: 'later', tier: 2,
    why: 'Annoying now, broken later. Do it while it is only annoying.' },
  { text: 'Mute the group that wakes you at night', theme: 'phone', box: 'later', tier: 3,
    why: 'Looks like a settings fiddle. It is your sleep.' },
  { text: 'Write down what you spend each week', theme: 'phone', box: 'later', tier: 3,
    why: 'You cannot fix money you never look at.' },
  { text: 'Unfollow the accounts that make you feel bad', theme: 'phone', box: 'later', tier: 3,
    why: 'Two minutes of tapping, months of difference.' },

  /* ---------- phone: GIVE AWAY ---------- */
  { text: 'Nobody has answered the club post yet', theme: 'phone', box: 'give', tier: 1,
    why: 'Urgent for whoever asked. It was never addressed to you.' },
  { text: 'Group asking for the wifi password', theme: 'phone', box: 'give', tier: 2,
    why: 'Anyone connected can answer in five seconds.' },
  { text: 'Someone needs the meeting link, three have it', theme: 'phone', box: 'give', tier: 2,
    why: 'Urgent for them, solved by any one of three people.' },
  { text: 'A reply is needed today and it is not your thread', theme: 'phone', box: 'give', tier: 2,
    why: 'Reading it first did not make it yours.' },
  { text: 'Someone must add the new kid to the group', theme: 'phone', box: 'give', tier: 2,
    why: 'Anyone with admin can do it. It does not need you.' },
  { text: 'The table still is not booked for tonight', theme: 'phone', box: 'give', tier: 3,
    why: 'Feels like yours because you read it first. It is not.' },
  { text: 'Club account has not replied to anyone', theme: 'phone', box: 'give', tier: 3,
    why: 'Urgent for the club, and the club has other members.' },

  /* ---------- phone: DROP ---------- */
  { text: 'Open the same app you just closed', theme: 'phone', box: 'drop', tier: 1,
    why: 'Nothing changed in nine seconds.' },
  { text: 'Check who viewed your story', theme: 'phone', box: 'drop', tier: 1,
    why: 'Feels urgent. Is not. Nothing changes either way.' },
  { text: 'Count how many people follow you, again', theme: 'phone', box: 'drop', tier: 1,
    why: 'The number does not move because you looked at it.' },
  { text: 'Reply to a spam message', theme: 'phone', box: 'drop', tier: 2,
    why: 'Answering it only invites more.' },
  { text: 'Refresh waiting for someone to reply', theme: 'phone', box: 'drop', tier: 2,
    why: 'They will reply or they will not. Refreshing does neither.' },
  { text: 'Re-read an old chat to feel bad', theme: 'phone', box: 'drop', tier: 3,
    why: 'It is over. Reading it again changes nothing.' },
  { text: 'Screenshot memes you will never open again', theme: 'phone', box: 'drop', tier: 3,
    why: 'Filling your storage instead of doing anything.' },

  /* ############################################################
     THEME: OUT  -  Level 4
     No easy cards at all. Everything here argues back.
     ############################################################ */

  /* ---------- out: DO NOW ---------- */
  { text: 'Last bus home leaves in 10 minutes', theme: 'out', box: 'now', tier: 2,
    why: 'Miss it and the whole evening falls apart.' },
  { text: 'Wallet gone, your friends are waiting to go', theme: 'out', box: 'now', tier: 2,
    why: 'Look now while you still remember where you were.' },
  { text: 'Deep cut on your knee, still bleeding', theme: 'out', box: 'now', tier: 2,
    why: 'Clean it now or it turns into a much bigger problem.' },
  { text: 'Nobody woke you, school starts in 30 minutes', theme: 'out', box: 'now', tier: 2,
    why: 'Whoever should have woken you did not. It is still your morning.' },
  { text: 'Left your bag on the bus, office shuts at 6', theme: 'out', box: 'now', tier: 3,
    why: 'Feels hopeless, so people put it off. The window is today.' },
  { text: 'Friend locked out, waiting at your gate', theme: 'out', box: 'now', tier: 3,
    why: 'Looks like somebody else can go. Nobody else is home.' },
  { text: 'Storm coming, you are 20 minutes from home', theme: 'out', box: 'now', tier: 3,
    why: 'Leave now and it is a walk. Wait and it is a problem.' },

  /* ---------- out: DO LATER ---------- */
  { text: 'Say your tooth needs looking at, no pain yet', theme: 'out', box: 'later', tier: 2,
    why: 'Ignore it and it becomes a Do Now with toothache.' },
  { text: 'Your friends all play something, you have not moved', theme: 'out', box: 'later', tier: 2,
    why: 'Nothing bad happens today. That is why it gets skipped.' },
  { text: 'Learn the route before your first day', theme: 'out', box: 'later', tier: 2,
    why: 'Do it calmly now or panic about it on the morning.' },
  { text: 'Save part of your pocket money this month', theme: 'out', box: 'later', tier: 2,
    why: 'Nobody makes you. That is exactly the problem.' },
  { text: 'Say your shoes are falling apart, before they go', theme: 'out', box: 'later', tier: 3,
    why: 'They still work today. They will fail on the worst day.' },
  { text: 'Fix your posture, back aches after school', theme: 'out', box: 'later', tier: 3,
    why: 'It only gets harder to fix the longer you leave it.' },
  { text: 'Get a haircut before it drives you mad', theme: 'out', box: 'later', tier: 3,
    why: 'Small, easy, and it never gets booked by itself.' },

  /* ---------- out: GIVE AWAY ---------- */
  { text: 'Cake pickup by 5pm, dad drives past', theme: 'out', box: 'give', tier: 2,
    why: 'Zero extra effort for him, a whole trip for you.' },
  { text: 'Brother needs a lift, mum is driving that way', theme: 'out', box: 'give', tier: 2,
    why: 'Already happening. You do not need to be involved.' },
  { text: 'Library book due today, friend passes it', theme: 'out', box: 'give', tier: 2,
    why: 'Urgent, low stakes, and already on their way.' },
  { text: 'Drinks need carrying, four people standing', theme: 'out', box: 'give', tier: 2,
    why: 'Urgent, and there are eight free hands already.' },
  { text: 'Match needs a scorekeeper, you are playing', theme: 'out', box: 'give', tier: 2,
    why: 'Urgent, but you literally cannot do both.' },
  { text: 'Snacks still needed for 4pm', theme: 'out', box: 'give', tier: 3,
    why: 'You offered first, so it feels yours. It is still just an errand.' },
  { text: 'A borrowed umbrella has to go back today', theme: 'out', box: 'give', tier: 3,
    why: 'Urgent, tiny, and it does not need your hands to travel.' },

  /* ---------- out: DROP ---------- */
  { text: 'Take twenty photos of the same view', theme: 'out', box: 'drop', tier: 2,
    why: 'The first one was fine. The other nineteen are time.' },
  { text: 'Check the weather for a city you do not live in', theme: 'out', box: 'drop', tier: 2,
    why: 'Interesting for four seconds. Useful for none.' },
  { text: 'Follow your friends round the same aisle again', theme: 'out', box: 'drop', tier: 2,
    why: 'Nobody is shopping any more. You are all just walking.' },
  { text: 'Scroll your phone while your friends talk', theme: 'out', box: 'drop', tier: 3,
    why: 'Costs you the thing you actually came out for.' },
  { text: 'Queue an hour for the drink everyone posts', theme: 'out', box: 'drop', tier: 3,
    why: 'It feels urgent because it is a queue. It is a drink.' },
  { text: 'Window-shop things you cannot buy', theme: 'out', box: 'drop', tier: 3,
    why: 'Looks like research. You are not buying it either way.' },
  { text: 'Sit through an ad you could have skipped', theme: 'out', box: 'drop', tier: 3,
    why: 'The skip button was right there.' }
];

/* The four boxes. Order matters - it matches the screen corners. */
var BOXES = {
  now:   { label: 'Do Now',     hint: 'important + due soon',  corner: 'tl', sprite: 'bang'  },
  later: { label: 'Do Later',   hint: 'important, not yet',    corner: 'tr', sprite: 'cal'   },
  give:  { label: 'Give Away',  hint: 'urgent, not yours',     corner: 'bl', sprite: 'arrow' },
  drop:  { label: 'Drop',       hint: 'neither',               corner: 'br', sprite: 'bin'   }
};
