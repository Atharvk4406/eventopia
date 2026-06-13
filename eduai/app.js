// ── CONFIG ────────────────────────────────────────────────────────────────────
const GEMINI_KEY = 'AIzaSyBagLUmCNDJX1k47EXrNQbgnVdsuJSaa5g';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

// ── GEMINI API ────────────────────────────────────────────────────────────────
async function askGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

// ── LOCALSTORAGE HELPERS ──────────────────────────────────────────────────────
const LS = {
  get: (k, def = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── STATS HELPERS ─────────────────────────────────────────────────────────────
function getStats() {
  return LS.get('eduai_stats', { sessions: 0, quizzes: 0, goals_done: 0, streak: 0, last_date: '' });
}
function bumpStat(key, n = 1) {
  const s = getStats();
  s[key] = (s[key] || 0) + n;
  // streak logic
  const today = new Date().toDateString();
  if (s.last_date !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    s.streak = s.last_date === yesterday ? (s.streak || 0) + 1 : 1;
    s.last_date = today;
  }
  LS.set('eduai_stats', s);
}

// ── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── ACTIVE NAV ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
});

// ── FORMAT AI TEXT → HTML ─────────────────────────────────────────────────────
function formatAI(text) {
  // Replace code blocks first
  let formatted = text.replace(/```(\w*)\n([\s\S]+?)\n```/g, (match, lang, code) => {
    return `<pre style="background:rgba(0,0,0,0.3);border:1px solid var(--border);padding:12px;border-radius:8px;overflow-x:auto;margin:10px 0;font-family:monospace;font-size:0.85rem;color:#f1f5f9;"><code class="language-${lang}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
  });
  
  // Replace inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;color:#e2e8f0">$1</code>');
  
  // Replace headings
  formatted = formatted.replace(/^### (.*$)/gim, '<h4 style="margin:12px 0 6px;color:var(--blue2);font-size:1.05rem;font-weight:700">$1</h4>');
  formatted = formatted.replace(/^## (.*$)/gim, '<h3 style="margin:16px 0 8px;color:var(--blue2);font-size:1.15rem;font-weight:700">$1</h3>');
  formatted = formatted.replace(/^# (.*$)/gim, '<h2 style="margin:20px 0 10px;color:var(--blue2);font-size:1.25rem;font-weight:800">$1</h2>');
  
  // Replace bullet lists
  formatted = formatted.replace(/^\s*[\-\*\•]\s+(.+)$/gm, '<li style="margin-left:20px;margin-bottom:4px">$1</li>');
  
  // Bold & Italic
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Replace newlines with <br> (excluding inside <pre> tags)
  const parts = formatted.split(/(<\/pre>)/);
  formatted = parts.map(part => {
    if (part.startsWith('<pre') || part === '</pre>') {
      return part;
    }
    return part.replace(/\n/g, '<br>');
  }).join('');
  
  return formatted;
}

// ── OFFLINE TUTOR FALLBACK RESPONSES ──────────────────────────────────────────
function getFallbackTutorResponse(subject, query) {
  const q = query.toLowerCase();
  
  // 1. GREETING
  if (q.includes('hello') || q.includes('hi ') || q.includes('hey')) {
    return `Hello! I am your Offline AI Tutor for **${subject}** (running in fallback mode). I can help you with:
- **Concept explanations** (e.g., "Explain recursion" or "Explain photosynthesis")
- **Study resources** (e.g., "Recommend resources")
- **Formulas and facts** (e.g., "Give formulas")
- **Study tips** (e.g., "Give me a study tip")
Feel free to ask a question!`;
  }

  // 2. STUDY TIPS
  if (q.includes('tip') || q.includes('study tip') || q.includes('how to study')) {
    const tips = [
      "Use **active recall** — close the book and write down everything you remember, then check for gaps.",
      "Try the **Pomodoro technique**: study focused for 25 minutes, then take a 5-minute break. Repeat.",
      "**Feynman technique**: try to explain the concept in the simplest terms possible, as if teaching a child.",
      "**Spaced repetition**: review notes after 1 day, then 3 days, 1 week, and then 1 month to move it to long-term memory."
    ];
    return `### 💡 Offline Study Tip for ${subject}\n\n` + tips[Math.floor(Math.random() * tips.length)];
  }

  // 3. RECOMMEND RESOURCES
  if (q.includes('resource') || q.includes('recommend') || q.includes('youtube') || q.includes('book') || q.includes('website')) {
    const resources = {
      'Mathematics': `### 📚 Recommended Resources for Mathematics

Here are some excellent resources to master Math:

#### 🎥 YouTube Channels
- **3Blue1Brown:** Visual explanations of calculus, linear algebra, and deep math concepts.
- **Khan Academy:** Step-by-step school level math and calculus.
- **PatrickJMT:** Quick, straightforward math problem-solving tutorials.

#### 🌐 Websites
- **KhanAcademy.org:** Free practice exercises and progress tracking.
- **WolframAlpha.com:** Computational search engine to verify step-by-step solutions.
- **Paul's Online Math Notes:** Comprehensive notes for Calculus and Algebra.

#### 📖 Books
- *Calculus* by James Stewart (standard university text)
- *How to Solve It* by George Pólya (essential for problem-solving mindset)`,

      'Physics': `### 📚 Recommended Resources for Physics

Boost your physics understanding with these:

#### 🎥 YouTube Channels
- **MinutePhysics:** Short, animated explanations of physics theories.
- **Walter Lewin Lectures:** Classic, engaging MIT physics demonstrations.
- **Veritasium:** Science and engineering conceptual questions answered.

#### 🌐 Websites
- **The Physics Classroom:** Tutorials, animations, and practice worksheets.
- **PhET Interactive Simulations:** Interactive virtual physics labs by University of Colorado.
- **HyperPhysics:** A concept map layout of all physics topics.

#### 📖 Books
- *Fundamentals of Physics* by Halliday, Resnick, and Walker
- *Surely You're Joking, Mr. Feynman!* by Richard Feynman`,

      'Chemistry': `### 📚 Recommended Resources for Chemistry

Top resources for general and organic chemistry:

#### 🎥 YouTube Channels
- **Tyler DeWitt:** Incredibly simple explanations of high school chemistry concepts.
- **The Organic Chemistry Tutor:** Step-by-step chemistry, organic chem, and math solver.
- **CrashCourse Chemistry:** Fast-paced, engaging structural guide to chemistry.

#### 🌐 Websites
- **ChemGuide.co.uk:** Excellent resource for advanced school level chemistry.
- **PubChem:** Database for exploring chemical compounds.
- **Dynamic Periodic Table (ptable.com):** Fully interactive periodic table with properties.

#### 📖 Books
- *Chemistry: The Central Science* by Brown, LeMay, and Bursten
- *Organic Chemistry* by Clayden, Greeves, and Warren`,

      'Biology': `### 📚 Recommended Resources for Biology

Best resources to study life and biological systems:

#### 🎥 YouTube Channels
- **Amoeba Sisters:** Fun, cartoon-style biology explanations.
- **CrashCourse Biology:** Excellent overview of cellular systems, genetics, and ecology.
- **Bozeman Science:** Clear biology reviews for high school and university prep.

#### 🌐 Websites
- **BioNinja:** Fantastic resource for cellular and molecular biology.
- **NCBI / PubMed:** For reading advanced scientific publications.
- **HHMI BioInteractive:** High-quality videos, virtual labs, and interactive materials.

#### 📖 Books
- *Campbell Biology* by Lisa Urry and Michael Cain (the gold standard textbook)
- *The Selfish Gene* by Richard Dawkins`,

      'Computer Science': `### 📚 Recommended Resources for Computer Science

Master coding and software engineering:

#### 🎥 YouTube Channels
- **CS50 by Harvard:** The absolute best introduction to computer science.
- **freeCodeCamp.org:** 10+ hour complete coding tutorials for free.
- **Fireship:** Fast, highly informative code concepts explained in 100 seconds.

#### 🌐 Websites
- **W3Schools.com / MDN Web Docs:** Practical web dev documentation.
- **LeetCode.com:** Coding challenges to prepare for programming interviews.
- **GeeksforGeeks:** Excellent reference for algorithms and data structures.

#### 📖 Books
- *Clean Code* by Robert C. Martin (how to write professional code)
- *Introduction to Algorithms* by Cormen, Leiserson, Rivest, and Stein (CLRS)`,

      'English Literature': `### 📚 Recommended Resources for English Literature

Understand plays, novels, and writing tools:

#### 🎥 YouTube Channels
- **CrashCourse Literature:** Analysis of classic plays, novels, and poetry.
- **Thug Notes (Wisecrack):** Humorous but surprisingly deep literary analysis.
- **Ted-Ed Literature:** Animated stories behind literary masterpieces.

#### 🌐 Websites
- **SparkNotes / LitCharts:** High-quality chapter summaries, themes, and quotes.
- **Project Gutenberg:** Free ebooks for out-of-copyright classic novels.
- **Purdue OWL (Online Writing Lab):** Guidelines for essay writing and citations.

#### 📖 Books
- *How to Read Literature Like a Professor* by Thomas C. Foster
- *The Elements of Style* by Strunk and White`,

      'English': `### 📚 Recommended Resources for English Literature

Understand plays, novels, and writing tools:

#### 🎥 YouTube Channels
- **CrashCourse Literature:** Analysis of classic plays, novels, and poetry.
- **Thug Notes (Wisecrack):** Humorous but surprisingly deep literary analysis.
- **Ted-Ed Literature:** Animated stories behind literary masterpieces.

#### 🌐 Websites
- **SparkNotes / LitCharts:** High-quality chapter summaries, themes, and quotes.
- **Project Gutenberg:** Free ebooks for out-of-copyright classic novels.
- **Purdue OWL (Online Writing Lab):** Guidelines for essay writing and citations.

#### 📖 Books
- *How to Read Literature Like a Professor* by Thomas C. Foster
- *The Elements of Style* by Strunk and White`,

      'History': `### 📚 Recommended Resources for World History

Explore historical events and civilizations:

#### 🎥 YouTube Channels
- **CrashCourse World History:** Engaging, fast historical narrative.
- **Oversimplified:** Highly entertaining, animated military and political history.
- **Kings and Generals:** In-depth military history and map-based battle tracking.

#### 🌐 Websites
- **History.com:** Short articles on major historical milestones.
- **Britannica History:** Encyclopedic database of world history.
- **Ancient History Encyclopedia (World History Encyclopedia):** Very detailed articles.

#### 📖 Books
- *Sapiens: A Brief History of Humankind* by Yuval Noah Harari
- *A People's History of the United States* by Howard Zinn`,

      'Geography': `### 📚 Recommended Resources for Geography

Master physical geography and global maps:

#### 🎥 YouTube Channels
- **Geography Now:** Explores every single country in the world one by one.
- **RealLifeLore:** Fascinating maps, geopolitics, and statistics.
- **National Geographic:** Documentaries and short clips on earth science.

#### 🌐 Websites
- **Seterra:** Fun, interactive map quiz games for countries, cities, and flags.
- **USGS.gov:** US Geological Survey for earth science data and mapping.
- **Google Earth:** High-resolution virtual globe explorer.

#### 📖 Books
- *Prisoners of Geography* by Tim Marshall (how maps dictate global politics)
- *Physical Geography* by Alan Strahler`,

      'Economics': `### 📚 Recommended Resources for Economics

Understand markets, finance, and macro-systems:

#### 🎥 YouTube Channels
- **CrashCourse Economics:** Microeconomics and macroeconomics concepts.
- **Marginal Revolution University:** In-depth courses on economic theory.
- **Jacob Clifford:** Perfect explanations for AP and college introductory economics.

#### 🌐 Websites
- **Investopedia.com:** The ultimate dictionary for financial and economic terms.
- **FRED (Federal Reserve Economic Data):** Real-world economic data charts.
- **Our World in Data:** Excellent visual tracking of long-term economic development.

#### 📖 Books
- *Economics in One Lesson* by Henry Hazlitt
- *Thinking, Fast and Slow* by Daniel Kahneman`
    };
    return resources[subject] || `No pre-baked resources for ${subject}. Try searching online at Google Scholar or Khan Academy!`;
  }

  // 4. FORMULAS & FACTS
  if (q.includes('formula') || q.includes('fact') || q.includes('key')) {
    const formulas = {
      'Mathematics': `### 📋 Key Mathematical Formulas

Here are 3 essential mathematical formulas:

1. **Quadratic Formula:**
   For any quadratic equation $ax^2 + bx + c = 0$, the roots are:
   $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

2. **Euler's Identity:**
   Relates five fundamental mathematical constants:
   $$e^{i\\pi} + 1 = 0$$

3. **Area of a Circle:**
   $$A = \\pi r^2$$`,

      'Physics': `### 📋 Key Physics Formulas

Here are 3 fundamental physics equations:

1. **Einstein's Mass-Energy Equivalence:**
   $$E = mc^2$$
   Shows that mass and energy are interchangeable ($c$ is speed of light).

2. **Newton's Second Law:**
   $$F = ma$$
   Force equals mass times acceleration.

3. **Kinematic Equation for Displacement:**
   $$d = v_0 t + \\frac{1}{2}at^2$$`,

      'Chemistry': `### 📋 Key Chemistry Facts & Formulas

Here are 3 fundamental chemistry constants and formulas:

1. **Avogadro's Number:**
   $$1\\text{ mole} = 6.022 \\times 10^{23}\\text{ particles}$$
   Essential for converting atomic mass units to grams.

2. **Ideal Gas Law:**
   $$PV = nRT$$
   Relates Pressure ($P$), Volume ($V$), moles ($n$), gas constant ($R$), and Temperature ($T$).

3. **pH Formula:**
   $$\\text{pH} = -\\log_{10}[\\text{H}^+]$$
   Measures the acidity/alkalinity of a solution.`,

      'Biology': `### 📋 Key Biology Facts

Here are 3 key biological facts to remember:

1. **The Central Dogma:**
   Genetic information flows from **DNA** to **RNA** (transcription) and then to **Protein** (translation).

2. **Mitochondria - Powerhouse of the Cell:**
   Mitochondria generate energy for the cell in the form of **ATP (Adenosine Triphosphate)** through cellular respiration.

3. **Mitosis vs Meiosis:**
   - **Mitosis:** Division of somatic cells producing 2 identical diploid daughter cells (for growth/repair).
   - **Meiosis:** Division of germ cells producing 4 genetically diverse haploid gametes (for reproduction).`,

      'Computer Science': `### 📋 Key Computer Science Facts & Complexities

Here are 3 fundamental computer science facts:

1. **Big-O Complexity Categories:**
   Describes algorithm efficiency:
   - $O(1)$: Constant time (Fastest)
   - $O(\\log n)$: Logarithmic time (e.g. Binary Search)
   - $O(n)$: Linear time (e.g. Linear Search)
   - $O(n \\log n)$: Linearithmic time (e.g. Merge Sort)
   - $O(n^2)$: Quadratic time (e.g. Bubble Sort)

2. **Boolean Logic:**
   - **AND (&):** True only if both inputs are True.
   - **OR (|):** True if at least one input is True.
   - **NOT (!):** Inverts the logic state.

3. **Stack vs Heap Memory:**
   - **Stack:** Fast, automated allocation managed by CPU (local variables).
   - **Heap:** Dynamic allocation managed manually by developer (objects, arrays).`,

      'English Literature': `### 📋 Key Literary Concepts

Here are 3 essential English literature analysis concepts:

1. **Protagonist vs Antagonist:**
   - **Protagonist:** The central character in a story, driving the plot forward.
   - **Antagonist:** The force or character opposing the protagonist, creating conflict.

2. **Theme:**
   The underlying message, moral, or central idea that the author explores throughout a literary work (e.g., *ambition* in Macbeth).

3. **Alliteration:**
   The repetition of the initial consonant sounds in neighboring words.
   *Example:* "Peter Piper picked a peck of pickled peppers."`,

      'English': `### 📋 Key Literary Concepts

Here are 3 essential English literature analysis concepts:

1. **Protagonist vs Antagonist:**
   - **Protagonist:** The central character in a story, driving the plot forward.
   - **Antagonist:** The force or character opposing the protagonist, creating conflict.

2. **Theme:**
   The underlying message, moral, or central idea that the author explores throughout a literary work (e.g., *ambition* in Macbeth).

3. **Alliteration:**
   The repetition of the initial consonant sounds in neighboring words.
   *Example:* "Peter Piper picked a peck of pickled peppers."`,

      'History': `### 📋 Key Historical Milestones

Here are 3 major milestones in modern world history:

1. **Signing of Magna Carta (1215):**
   Established the principle that everyone, including the king, is subject to the law, paving the way for constitutional democracy.

2. **Fall of Constantinople (1453):**
   Ended the Byzantine Empire, prompting European explorers to find new sea routes to Asia, leading to the Age of Discovery.

3. **Signing of United Nations Charter (1945):**
   Drafted after World War II to maintain international peace and security and foster cooperation.`,

      'Geography': `### 📋 Key Geography Facts

Here are 3 important geographical facts:

1. **The Earth's Layers:**
   The Earth has 4 major layers: the **Crust** (solid surface), the **Mantle** (semi-fluid rock), the **Outer Core** (liquid iron/nickel), and the **Inner Core** (solid iron/nickel).

2. **The Water Cycle (Hydrologic Cycle):**
   The continuous movement of water on, above, and below the surface of the Earth, driven by:
   - **Evaporation** (liquid to gas)
   - **Condensation** (gas to liquid clouds)
   - **Precipitation** (rain/snow falling)

3. **Tropic Boundaries:**
   - **Tropic of Cancer:** 23.5° North of Equator.
   - **Tropic of Capricorn:** 23.5° South of Equator.
   The tropical zone lies between these lines.`,

      'Economics': `### 📋 Key Economics Concepts

Here are 3 core concepts in economic theory:

1. **Gross Domestic Product (GDP):**
   The total monetary value of all finished goods and services produced within a country's borders in a specific time period.

2. **Inflation:**
   The general increase in prices and fall in the purchasing power of money over time.

3. **Opportunity Cost:**
   The loss of potential gain from other alternatives when one alternative is chosen. (The cost of the next best choice foregone).`
    };
    return formulas[subject] || `No pre-baked facts for ${subject}. Always write notes and review definitions!`;
  }

  // 5. CONCEPT EXPLANATION FALLBACKS
  const lowerSubject = subject.toLowerCase();
  
  if (lowerSubject === 'mathematics' || q.includes('math') || q.includes('equation') || q.includes('calculus') || q.includes('pythagoras')) {
    return `### 📐 Mathematics: Pythagorean Theorem & Algebra

Since the Gemini API is currently offline/rate-limited, here is a detailed, structured refresher on a key mathematical concept: **The Pythagorean Theorem**.

#### Conceptual Explanation
In any right-angled triangle, the area of the square whose side is the hypotenuse ($c$) is equal to the sum of the areas of the squares on the other two sides ($a$ and $b$):

$$\\mathbf{a^2 + b^2 = c^2}$$

#### Step-by-Step Working Example
Let's solve for the hypotenuse of a right-angled triangle with sides $a = 6\\text{ cm}$ and $b = 8\\text{ cm}$:
1. **State the formula:**
   $$c^2 = a^2 + b^2$$
2. **Substitute the known values:**
   $$c^2 = 6^2 + 8^2$$
   $$c^2 = 36 + 64$$
3. **Add the values:**
   $$c^2 = 100$$
4. **Take the square root of both sides:**
   $$c = \\sqrt{100} = 10\\text{ cm}$$

Therefore, the hypotenuse is **$10\\text{ cm}$**.

*For more customized tutoring, please check your network connection and retry.*`;
  }

  if (lowerSubject === 'physics' || q.includes('gravity') || q.includes('force') || q.includes('motion') || q.includes('newton')) {
    return `### ⚛️ Physics: Newton's Laws & Force

Since the Gemini API is currently offline/rate-limited, here is a detailed refresher on **Newton's Second Law of Motion**.

#### Explanation
Newton's Second Law states that the acceleration of an object as produced by a net force is directly proportional to the magnitude of the net force, in the same direction as the net force, and inversely proportional to the mass of the object.

$$\\mathbf{F = ma}$$

Where:
- **$F$** is Net Force (in Newtons, $N$)
- **$m$** is Mass (in kilograms, $kg$)
- **$a$** is Acceleration (in meters per second squared, $m/s^2$)

#### Step-by-Step Working Example
**Problem:** A $1500\\text{ kg}$ car accelerates at a rate of $3\\text{ m/s}^2$. What net force is acting on the car?
1. **Identify variables:** $m = 1500\\text{ kg}$, $a = 3\\text{ m/s}^2$.
2. **State formula:** $F = ma$.
3. **Calculate:**
   $$F = 1500 \\times 3 = 4500\\text{ N}$$
   
The net force required is **$4500\\text{ Newtons}$**.`;
  }

  if (lowerSubject === 'chemistry' || q.includes('acid') || q.includes('bond') || q.includes('reaction') || q.includes('molecule')) {
    return `### 🧪 Chemistry: Chemical Bonding

Since the Gemini API is currently offline/rate-limited, here is a detailed overview of **Chemical Bonding**.

#### Explanation
Atoms form bonds to achieve a stable electron configuration, typically an octet (8 outer electrons).

#### 1. Ionic Bonds
- **Mechanism:** Electron transfer from a metal to a non-metal.
- **Example:** Sodium ($\text{Na}$) transfers an electron to Chlorine ($\text{Cl}$) forming $\text{Na}^+$ and $\text{Cl}^-$, attracting into **$\text{NaCl}$** (table salt).

#### 2. Covalent Bonds
- **Mechanism:** Sharing of electron pairs between non-metal atoms.
- **Example:** Water ($\text{H}_2\text{O}$), where Oxygen shares electrons with two Hydrogen atoms.

*Check your internet connection or API key to query specific chemical reactions!*`;
  }

  if (lowerSubject === 'biology' || q.includes('photo') || q.includes('cell') || q.includes('mitosis') || q.includes('dna')) {
    return `### 🧬 Biology: Cell Structure and Photosynthesis

Since the Gemini API is currently offline/rate-limited, here is a breakdown of **Photosynthesis**.

#### Explanation
Photosynthesis is how autotrophs (like green plants) convert light energy into chemical energy.

#### The Chemical Equation
$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{Light Energy} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

#### Key Structures
- **Chloroplasts:** The organelle where photosynthesis occurs.
- **Chlorophyll:** The green pigment that absorbs light.
- **Stomata:** Pores in leaves that take in Carbon Dioxide and release Oxygen.`;
  }

  if (lowerSubject === 'computer science' || q.includes('code') || q.includes('recursion') || q.includes('algorithm') || q.includes('python')) {
    return `### 💻 Computer Science: Recursion Explanation

Since the Gemini API is currently offline/rate-limited, here is a study guide on **Recursion** in programming.

#### Definition
Recursion occurs when a function calls itself to solve a problem by breaking it down into smaller sub-problems.

#### Key Code Structure (JavaScript / Python style)
\`\`\`python
def factorial(n):
    # 1. Base Case (stops the loop)
    if n <= 1:
        return 1
    # 2. Recursive Case (calls itself)
    else:
        return n * factorial(n - 1)
\`\`\`

#### Executing \`factorial(3)\` Step-by-Step
- \`factorial(3)\` calls \`3 * factorial(2)\`
- \`factorial(2)\` calls \`2 * factorial(1)\`
- \`factorial(1)\` hits base case and returns \`1\`
- Unwinding: \`2 * 1 = 2\`, then \`3 * 2 = 6\`. Result is **6**.`;
  }

  // DEFAULT GENERIC FALLBACK
  return `### 🎓 ${subject} Study Guide

*(System Notice: Google Gemini is currently at full capacity or rate-limited. Enjoy this premium offline study guide for your topic)*

#### Core Recommendations for studying ${subject}:
1. **Grasp Core Definitions:** Make sure you can write the definition of major terms in your own words.
2. **Summarize Key Points:** After reading a section, write a 3-bullet summary from memory.
3. **Use the Quiz Generator:** Navigate to the **Quiz** page and test your knowledge.
4. **Set Structured Goals:** Go to the **Planner** page to add a study session target.

Please try your query again in a moment, or select one of the **Quick Prompts** in the sidebar for pre-loaded educational materials!`;
}
