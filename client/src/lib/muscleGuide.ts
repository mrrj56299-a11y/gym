type Localized<T> = { ar: T; en: T };

export type MuscleGuide = {
  function: Localized<string>;
  tips: Localized<string[]>;
  stretches: Localized<string[]>;
};

export const muscleGuide: Record<string, MuscleGuide> = {
  chest: {
    function: {
      ar: "تدفع الذراع للأمام وعبر الجسم، وهي المحرك الرئيسي لحركات الدفع الأفقية.",
      en: "Drives the arm forward and across the body; the main mover in horizontal pressing.",
    },
    tips: {
      ar: ["ثبّت لوحي الكتف للأسفل والخلف أثناء الضغط.", "تحكّم في مرحلة النزول لمدة 2 إلى 3 ثوانٍ.", "استخدم قبضة أوسع قليلًا من عرض الكتفين."],
      en: ["Keep shoulder blades pinned down and back during presses.", "Control the lowering phase for 2 to 3 seconds.", "Use a grip slightly wider than shoulder width."],
    },
    stretches: {
      ar: ["تمدد الصدر عند الباب", "تمدد الذراع عبر الجسم"],
      en: ["Doorway chest stretch", "Cross-body arm stretch"],
    },
  },
  back: {
    function: {
      ar: "تسحب الذراع للأسفل وللخلف، والعضلات العريضة والمعينية وشبه المنحرفة تمنح الظهر عرضه وثباته.",
      en: "Pulls the arm down and back; lats, rhomboids and traps build width and posture.",
    },
    tips: {
      ar: ["ابدأ الشد بالمرفقين وليس بالكفين.", "تجنب التأرجح بالجذع للحفاظ على التركيز.", "أمسك لحظة قصيرة عند أقصى انقباض."],
      en: ["Lead the pull with the elbows, not the hands.", "Avoid swinging the torso to keep tension on the back.", "Pause briefly at full contraction."],
    },
    stretches: {
      ar: ["تمدد العريضة من وضعية الطفل", "تمدد التعليق على العقلة"],
      en: ["Child's pose lat reach", "Hanging lat stretch"],
    },
  },
  shoulders: {
    function: {
      ar: "ترفع الذراع وتديرها، والدالية الأمامية والجانبية والخلفية تغطي المقدمة والجانب والخلف.",
      en: "Raises and rotates the arm; the front, side and rear deltoid heads cover the shoulder.",
    },
    tips: {
      ar: ["استخدم أوزانًا أخف في رفرفة الجانب للحفاظ على الشكل.", "لا ترفع الكتفين نحو الأذنين أثناء الرفع.", "حافظ على مدى حركة كامل ومتحكَّم فيه."],
      en: ["Use lighter loads for lateral raises to keep form strict.", "Do not shrug the shoulders toward the ears.", "Work through a full, controlled range of motion."],
    },
    stretches: {
      ar: ["تمدد الكتف عبر الجسم", "تمدد الذراع خلف الظهر"],
      en: ["Cross-body shoulder stretch", "Arm-behind-back stretch"],
    },
  },
  biceps: {
    function: {
      ar: "تثني المرفق وتدير الساعد للأعلى، ويساعد الرأس الطويل في رفع الذراع للأمام.",
      en: "Bends the elbow and turns the forearm palm-up; the long head also assists shoulder flexion.",
    },
    tips: {
      ar: ["ثبّت المرفقين بجانب الجسم أثناء الرفع.", "أدر الكف للأعلى في نهاية الحركة.", "تحكّم في النزول البطيء لتحفيز النمو."],
      en: ["Keep the elbows fixed beside the torso while curling.", "Turn the palms up fully at the top of the movement.", "Use a slow, controlled lowering phase."],
    },
    stretches: {
      ar: ["تمدد ذات الرأسين على الحائط", "تمدد الساعد للخلف"],
      en: ["Wall-supported biceps stretch", "Palm-down forearm extension"],
    },
  },
  triceps: {
    function: {
      ar: "تمد المرفق، وتشكل نحو ثلثي كتلة عضلات الذراع العلوية.",
      en: "Extends the elbow and makes up roughly two-thirds of upper-arm mass.",
    },
    tips: {
      ar: ["أبقِ المرفقين قريبين من الرأس أثناء التمرين.", "أكمل مد المرفق بالكامل دون قفل مؤلم.", "التمارين فوق الرأس تستهدف الرأس الطويل بشكل أفضل."],
      en: ["Keep the elbows tucked close to the head during extensions.", "Fully extend the elbow without locking painfully.", "Overhead variations target the long head best."],
    },
    stretches: {
      ar: ["تمدد ثلاثية الرؤوس فوق الرأس", "الوصول للكتف من خلف الرأس"],
      en: ["Overhead triceps stretch", "Behind-the-head reach"],
    },
  },
  forearms: {
    function: {
      ar: "تتحكم في ثني الرسغ ومده وفي قوة القبضة.",
      en: "Control wrist flexion, extension and grip strength.",
    },
    tips: {
      ar: ["درّب الرسغ في الاتجاهين لتوازن القوة.", "حافظ على حجم تدريب معتدل لتجنب إجهاد الرسغ.", "استخدم أوزانًا مريحة في التمارين الثقيلة للقبضة."],
      en: ["Train the wrist in both directions to balance strength.", "Keep volume moderate to avoid wrist overuse.", "Grip work should use loads you can control fully."],
    },
    stretches: {
      ar: ["تمدد ثانيات الرسغ", "تمدد باسطات الرسغ"],
      en: ["Wrist flexor stretch", "Wrist extensor stretch"],
    },
  },
  quadriceps: {
    function: {
      ar: "تمد الركبة، والمستقيمة الفخذية تساعد أيضًا في ثني الورك.",
      en: "Extends the knee; the rectus femoris also flexes the hip.",
    },
    tips: {
      ar: ["اجعل الركبة تتبع اتجاه أصابع القدم.", "اختر عمقًا مريحًا للانحناء دون ألم.", "تحكّم في مرحلة النزول لتقوية الألياف."],
      en: ["Let the knee track in line with the toes.", "Squat only to a depth you can control without pain.", "Control the eccentric phase to build the muscle fibres."],
    },
    stretches: {
      ar: ["تمدد الفخذ الأمامي واقفًا", "تمدد الورك من وضعية نصف الركوع"],
      en: ["Standing quad stretch", "Half-kneeling hip flexor stretch"],
    },
  },
  hamstrings: {
    function: {
      ar: "تثني الركبة وتمد الورك، وتعمل مع الألوية في الحركات المفصلية.",
      en: "Flex the knee and extend the hip; they work together with the glutes.",
    },
    tips: {
      ar: ["ابدأ الحركة من مفصل الورك مع ثني خفيف في الركبة.", "حافظ على استقامة الظهر أثناء الانحناء.", "أنزل الوزن ببطء في الحركات المتحكم فيها."],
      en: ["Hinge from the hips with a slight knee bend.", "Keep the spine neutral during the hinge.", "Lower the load slowly in controlled movements."],
    },
    stretches: {
      ar: ["تمدد أوتار المأبض واقفًا", "تمدد أوتار المأبض جالسًا بالمنشفة"],
      en: ["Standing hamstring stretch", "Seated towel hamstring stretch"],
    },
  },
  glutes: {
    function: {
      ar: "تمد الورك وتدوره، وهي أساسية لثبات الحوض والقوة الانفجارية.",
      en: "Extend and rotate the hip; key for pelvic stability and power.",
    },
    tips: {
      ar: ["اضغط الألوية في أعلى الحركة لمدة لحظة.", "ركّز على الإحساس بالعضلة أثناء كل تكرار.", "زد الحمل تدريجيًا مع الحفاظ على الشكل."],
      en: ["Squeeze the glutes at the top of each rep.", "Focus on feeling the muscle through the full range.", "Increase load gradually while keeping form clean."],
    },
    stretches: {
      ar: ["تمدد الشكل الرقمي أربعة", "وضعية الحمامة"],
      en: ["Figure-four stretch", "Pigeon pose"],
    },
  },
  calves: {
    function: {
      ar: "تبسط مفصل الكاحل نحو أسفل القدم، والتوأمية تعبر الركبة بينما النعلية تعمل مع ركبة مثنية.",
      en: "Plantarflex the ankle; the gastrocnemius crosses the knee while the soleus works with a bent knee.",
    },
    tips: {
      ar: ["استخدم مدى حركة كاملًا مع توقف في الأعلى والأسفل.", "نوّع زاوية الركبة لاستهداف النعلية.", "تحمّل الحمل تدريجيًا لأن عضلات الساق قوية بطبيعتها."],
      en: ["Use full range with a pause at the top and bottom.", "Vary knee angle to target the soleus.", "Progress load steadily; calves respond well to volume."],
    },
    stretches: {
      ar: ["تمدد التوأمية على الحائط", "تمدد الساق بالنزول من درجة"],
      en: ["Wall calf stretch", "Step-down calf stretch"],
    },
  },
  abs: {
    function: {
      ar: "تثني الجذع وتثبته؛ المائلة تدور الجذع وتميله، والمستعرضة تحمي أسفل الظهر.",
      en: "Flex and stabilize the trunk; obliques rotate and side-bend it, transverse abdominis stabilizes the core.",
    },
    tips: {
      ar: ["أخرج الزفير أثناء انقباض البطن.", "لا تسحب الرقبة باليدين، واجعل البطن هو المحرك.", "قدّم التحكم على عدد التكرارات."],
      en: ["Exhale as you contract the abdominals.", "Do not pull on the neck; let the abs drive the movement.", "Prioritize control over the number of reps."],
    },
    stretches: {
      ar: ["تمدد الكوبرا", "ميلان الجانب واقفًا"],
      en: ["Cobra stretch", "Standing side bend"],
    },
  },
  adductors: {
    function: {
      ar: "تقرّب الفخذين من بعضهما، وهي مهمة لثبات الورك والحركة الجانبية.",
      en: "Bring the thighs together; key for hip stability and lateral movement.",
    },
    tips: {
      ar: ["استخدم مدى حركة متحكَّمًا فيه دون ارتداد.", "جرّب القرفصاء بقدمين متباعدتين أو جهاز التقريب.", "ابدأ بأوزان متوسطة وركّز على الشكل."],
      en: ["Use a controlled range without bouncing.", "Try wide-stance squats or the adductor machine.", "Start with moderate loads and focus on form."],
    },
    stretches: {
      ar: ["تمدد الفراشة", "ثبات القرفصاء الواسعة"],
      en: ["Butterfly stretch", "Wide-leg squat hold"],
    },
  },
};
