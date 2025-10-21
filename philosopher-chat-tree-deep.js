// Deep Tree-of-Thought Reasoning System
// Explores rabbit holes, uses different thinking modes, creates asymmetric trees

// Thinking modes that the model can use
const THINKING_MODES = {
    introspect: {
        name: 'Introspect',
        prompt: 'Reflect deeply on the internal logic and assumptions. What am I taking for granted here? What does this really mean when I examine it closely?',
        color: '#8B4789'
    },
    counter: {
        name: 'Counter-argue',
        prompt: 'Challenge this line of thinking. What are the strongest objections? What if the opposite were true? Where might this reasoning fail?',
        color: '#C14953'
    },
    define: {
        name: 'Define',
        prompt: 'What do the key terms really mean? Break down the definitions and examine what we mean when we use these words. Are we being precise?',
        color: '#4A7BA7'
    },
    analogize: {
        name: 'Analogize',
        prompt: 'Draw parallels to something concrete and familiar. How is this like something else? What metaphor or example illuminates this?',
        color: '#6B8E23'
    },
    synthesize: {
        name: 'Synthesize',
        prompt: 'Bring together different strands of thought. How do these ideas connect? What emerges when we combine them?',
        color: '#D4AF37'
    },
    question: {
        name: 'Question',
        prompt: 'What questions does this raise? Instead of answering, what would be worth asking next? What are we not seeing?',
        color: '#9370DB'
    },
    example: {
        name: 'Example',
        prompt: 'Make this concrete with a specific, detailed example. Show don\'t tell. What would this look like in practice?',
        color: '#CD853F'
    },
    extend: {
        name: 'Extend',
        prompt: 'Push this line of thinking further. What follows from this? If we accept this, what else must be true? Where does this lead?',
        color: '#20B2AA'
    }
};

// Analyze the user's question to determine best initial thinking modes
async function selectInitialModes(engine, persona, userMessage) {
    const prompt = `You are analyzing a philosophical question to determine the best initial approaches for exploring it deeply.

Question: "${userMessage}"

Available thinking modes:
- introspect: Reflect on internal logic and assumptions
- counter: Challenge the thinking with objections
- define: Clarify key terms and definitions
- analogize: Use metaphors and parallels
- synthesize: Connect different ideas
- question: Raise new questions to explore
- example: Use concrete examples
- extend: Push the logic further

Select 2-3 thinking modes that would be most valuable for exploring this question initially. Consider what the question is really asking and what approaches would yield the deepest insights.

Respond with ONLY a comma-separated list of mode names (e.g., "introspect,define,question")`;

    try {
        const completion = await engine.chat.completions.create({
            messages: [
                { role: "system", content: persona.systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 50,
            stream: false,
        });

        const response = completion.choices[0]?.message?.content.trim() || '';
        const modes = response.split(',').map(m => m.trim()).filter(m => THINKING_MODES[m]);

        // Fallback to defaults if parsing fails
        if (modes.length === 0) {
            return ['introspect', 'question', 'define'];
        }

        return modes.slice(0, 3); // Max 3 modes
    } catch (error) {
        console.error('Error selecting initial modes:', error);
        return ['introspect', 'question', 'define']; // Fallback
    }
}

// Generate a deep thought (paragraph-form) using a specific thinking mode
async function generateDeepThought(engine, persona, userMessage, thinkingMode, previousThoughts = [], temperature = 0.8) {
    const mode = THINKING_MODES[thinkingMode];

    // Build context from previous thoughts
    const thoughtChain = previousThoughts.length > 0
        ? `\n\nPrevious reasoning:\n${previousThoughts.map((t, i) => `${i + 1}. [${t.mode}] ${t.text}`).join('\n\n')}`
        : '';

    const prompt = `You are ${persona.name}. ${persona.systemPrompt}

Question: "${userMessage}"
${thoughtChain}

Thinking mode: ${mode.name}
${mode.prompt}

Write a paragraph (3-5 sentences) exploring this question using ${mode.name} thinking. Build on any previous thoughts if present. Be thorough and deep - this is internal reasoning, not your final answer.`;

    try {
        const completion = await engine.chat.completions.create({
            messages: [
                { role: "system", content: persona.systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: temperature,
            max_tokens: 250,
            stream: false,
        });

        return completion.choices[0]?.message?.content.trim() || '';
    } catch (error) {
        console.error(`Error generating ${mode.name} thought:`, error);
        return null;
    }
}

// Evaluate if a thought is worth exploring further
async function evaluateThoughtPromise(engine, thought, depth) {
    // Heuristic scoring - no LLM call needed for speed
    let score = 50; // Base score

    // Reward depth
    score -= depth * 5; // Each level deeper gets slightly lower base score (natural pruning)

    // Reward length (paragraph-form)
    const sentences = thought.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 3 && sentences.length <= 6) {
        score += 20;
    } else if (sentences.length < 2) {
        score -= 30; // Penalize too short
    }

    // Reward specific philosophical markers
    const markers = ['because', 'however', 'therefore', 'consider', 'but', 'yet', 'thus', 'if', 'when', 'means', 'implies'];
    const hasMarkers = markers.filter(m => thought.toLowerCase().includes(m)).length;
    score += Math.min(hasMarkers * 5, 25);

    // Reward questions (shows continued exploration)
    const questions = (thought.match(/\?/g) || []).length;
    score += Math.min(questions * 8, 20);

    // Random variation (exploration vs exploitation)
    score += (Math.random() - 0.5) * 15;

    return Math.max(0, Math.min(100, score));
}

// Decide which thinking modes to explore next (up to 3 branches)
async function selectNextModes(engine, currentMode, previousModes, thought, depth, maxDepth) {
    if (depth >= maxDepth) return [];

    // Don't repeat the same mode twice in a row
    const availableModes = Object.keys(THINKING_MODES).filter(m => m !== currentMode);

    // Branching probability decreases with depth
    const branchProbabilities = {
        0: 0.8,  // 80% chance to branch at root
        1: 0.6,  // 60% at depth 1
        2: 0.4,  // 40% at depth 2
        3: 0.2,  // 20% at depth 3
        4: 0.0   // No branching at depth 4 (would be depth 5 children)
    };

    const shouldBranch = Math.random() < (branchProbabilities[depth] || 0);

    if (shouldBranch) {
        // Create 2-3 branches with different modes
        const numBranches = Math.floor(Math.random() * 2) + 2; // 2 or 3 branches
        const shuffled = availableModes.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(numBranches, 3)); // Max 3 branches
    } else {
        // Single continuation - pick contextually appropriate mode

        // If thought has questions, continue with introspect or define
        if (thought.includes('?')) {
            const modes = ['introspect', 'define', 'question'].filter(m => m !== currentMode);
            return [modes[Math.floor(Math.random() * modes.length)]];
        }

        // If thought has counter-arguments, synthesize or extend
        if (thought.toLowerCase().includes('however') || thought.toLowerCase().includes('but')) {
            const modes = ['synthesize', 'extend', 'counter'].filter(m => m !== currentMode);
            return [modes[Math.floor(Math.random() * modes.length)]];
        }

        // Default: pick a random different mode
        return [availableModes[Math.floor(Math.random() * availableModes.length)]];
    }
}

// Recursive tree exploration with asymmetric branching (TRUE depth-first)
async function exploreThoughtBranch(
    engine,
    persona,
    userMessage,
    thinkingMode,
    previousThoughts = [],
    depth = 0,
    maxDepth = 6,
    onNodeCreated = null,
    parentNode = null,
    siblingIndex = 0
) {
    if (depth >= maxDepth) return null;

    // Generate thought for this node
    const thought = await generateDeepThought(engine, persona, userMessage, thinkingMode, previousThoughts);

    if (!thought) return null;

    // Evaluate promise of this thought
    const promise = await evaluateThoughtPromise(engine, thought, depth);

    // Create node
    const node = {
        id: `node-${Date.now()}-${Math.random()}`,
        text: thought,
        mode: thinkingMode,
        depth: depth,
        promise: promise,
        children: [],
        siblingIndex: siblingIndex,
        parent: parentNode
    };

    // Notify visualization IMMEDIATELY (before exploring children)
    if (onNodeCreated) {
        await onNodeCreated(node, parentNode, siblingIndex);
    }

    // Decide if we should continue exploring (dead end vs continue)
    const shouldContinue = promise > 30 || depth < 2; // Always explore at least 2 levels

    if (!shouldContinue) {
        // Dead end - mark it
        node.deadEnd = true;
        console.log(`  ${'  '.repeat(depth)}⊗ Dead end at ${thinkingMode} (promise: ${Math.round(promise)})`);
        return node;
    }

    // Decide which modes to explore next (can branch here)
    const nextModes = await selectNextModes(
        engine,
        thinkingMode,
        previousThoughts.map(t => t.mode),
        thought,
        depth,
        maxDepth
    );

    // Recursively explore each branch DEPTH-FIRST (sequential, not parallel)
    const newThoughtChain = [...previousThoughts, { text: thought, mode: thinkingMode, promise }];

    // Explore each branch one at a time, going DEEP before exploring siblings
    for (let i = 0; i < nextModes.length; i++) {
        const nextMode = nextModes[i];
        console.log(`  ${'  '.repeat(depth)}↳ Diving into ${nextMode} branch (${i + 1}/${nextModes.length}) at depth ${depth + 1}...`);

        // FULLY EXPLORE this child before moving to the next sibling
        const childNode = await exploreThoughtBranch(
            engine,
            persona,
            userMessage,
            nextMode,
            newThoughtChain,
            depth + 1,
            maxDepth,
            onNodeCreated,
            node,  // Pass current node as parent
            i      // Pass sibling index
        );

        if (childNode) {
            node.children.push(childNode);
        }

        const childCount = childNode ? countNodes(childNode) : 0;
        console.log(`  ${'  '.repeat(depth)}⮡ Surfacing from ${nextMode} branch (explored ${childCount} nodes)`);
    }

    return node;
}

// Summarize a branch of thought by collapsing leaf nodes upward
async function summarizeBranch(engine, persona, userMessage, node) {
    if (!node) return '';

    // If leaf node, return its thought as the summary
    if (node.children.length === 0) {
        return node.text;
    }

    // Recursively get summaries from children first (bottom-up)
    const childSummaries = await Promise.all(
        node.children.map(child => summarizeBranch(engine, persona, userMessage, child))
    );

    // Synthesize this node's thought with its children's summaries
    const mode = THINKING_MODES[node.mode];
    const prompt = `You are ${persona.name}. ${persona.systemPrompt}

Original question: "${userMessage}"

Current thought [${mode.name}]:
${node.text}

Insights from exploring this branch further:
${childSummaries.map((summary, i) => `${i + 1}. ${summary}`).join('\n\n')}

Synthesize these insights into a single concise summary (2-3 sentences) that captures the essence of this reasoning path.`;

    try {
        const completion = await engine.chat.completions.create({
            messages: [
                { role: "system", content: persona.systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 150,
            stream: false,
        });

        return completion.choices[0]?.message?.content.trim() || node.text;
    } catch (error) {
        console.error('Error summarizing branch:', error);
        return node.text; // Fallback to original thought
    }
}

// Generate final answer from all branch summaries
async function generateFinalAnswer(engine, persona, userMessage, branchSummaries) {
    const prompt = `You are ${persona.name}. ${persona.systemPrompt}

Question: "${userMessage}"

After deep exploration through different reasoning paths, here are the key insights:

${branchSummaries.map((summary, i) => `Path ${i + 1}:\n${summary}`).join('\n\n')}

Based on this thorough exploration, provide a clear, synthesized answer to the original question. Draw from the insights above but present a coherent, well-reasoned response (3-4 sentences).`;

    try {
        const completion = await engine.chat.completions.create({
            messages: [
                { role: "system", content: persona.systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 300,
            stream: false,
        });

        return completion.choices[0]?.message?.content.trim() || '';
    } catch (error) {
        console.error('Error generating final answer:', error);
        return 'Unable to generate final answer.';
    }
}

// Find the best leaf node (deepest, highest promise path)
function findBestLeaf(tree) {
    function findLeaves(node, path = []) {
        const currentPath = [...path, node];

        if (node.children.length === 0) {
            // Leaf node - calculate path quality
            const pathPromise = currentPath.reduce((sum, n) => sum + n.promise, 0) / currentPath.length;
            const pathDepth = currentPath.length;

            return [{
                node,
                path: currentPath,
                quality: pathDepth * 10 + pathPromise, // Prefer depth + promise
                avgPromise: pathPromise,
                depth: pathDepth
            }];
        }

        // Recursively find all leaves
        return node.children.flatMap(child => findLeaves(child, currentPath));
    }

    const allLeaves = findLeaves(tree);
    allLeaves.sort((a, b) => b.quality - a.quality);

    return allLeaves[0];
}

// Main entry point: Generate complete thought tree with DEPTH-FIRST exploration
async function generateThoughtTree(engine, persona, userMessage, maxDepth = 5, onNodeCreated = null, onSummarizing = null) {
    console.log('🌳 Starting deep tree-of-thought exploration (depth-first, up to 3 branches per node)...');
    console.log(`📊 Max depth: ${maxDepth} layers`);

    // Step 1: Analyze question to determine best initial thinking modes
    console.log('\n🔍 Analyzing question to select initial thinking modes...');
    const initialModes = await selectInitialModes(engine, persona, userMessage);
    console.log(`Selected modes: ${initialModes.join(', ')}`);

    const rootBranches = [];

    // Step 2: SEQUENTIAL exploration - complete each root branch before starting the next
    for (let i = 0; i < initialModes.length; i++) {
        const mode = initialModes[i];
        console.log(`\n🌱 Starting root branch ${i + 1}/${initialModes.length}: ${mode}`);
        console.log('━'.repeat(50));

        const branch = await exploreThoughtBranch(
            engine,
            persona,
            userMessage,
            mode,
            [],
            0,
            maxDepth,
            onNodeCreated,
            null,      // No parent for root branches
            i          // Sibling index for root branches
        );

        if (branch) {
            rootBranches.push(branch);
            console.log(`✅ Completed root branch: ${mode}`);
            console.log(`   Total nodes in this branch: ${countNodes(branch)}`);
        }

        console.log('━'.repeat(50));
    }

    // Combine into single tree structure
    const tree = {
        question: userMessage,
        branches: rootBranches,
        timestamp: Date.now(),
        totalNodes: rootBranches.reduce((sum, b) => sum + countNodes(b), 0)
    };

    // Find best reasoning path
    const bestPaths = rootBranches.map(branch => findBestLeaf(branch));
    bestPaths.sort((a, b) => b.quality - a.quality);
    const bestPath = bestPaths[0];

    console.log('\n🎯 Best reasoning path found:');
    console.log(`   Depth: ${bestPath.depth} layers`);
    console.log(`   Average promise: ${bestPath.avgPromise.toFixed(1)}`);
    console.log(`   Quality score: ${bestPath.quality.toFixed(1)}`);
    console.log(`   Thinking modes: ${bestPath.path.map(n => n.mode).join(' → ')}`);
    console.log(`   Total nodes explored: ${tree.totalNodes}`);

    // Step 3: Backward pass - summarize each branch
    console.log('\n📝 Summarizing reasoning paths...');
    if (onSummarizing) await onSummarizing();

    const branchSummaries = await Promise.all(
        rootBranches.map(branch => summarizeBranch(engine, persona, userMessage, branch))
    );

    // Step 4: Generate final answer from summaries
    console.log('\n💡 Generating final answer...');
    const finalAnswer = await generateFinalAnswer(engine, persona, userMessage, branchSummaries);

    return {
        tree,
        bestPath: bestPath.path,
        bestLeaf: bestPath.node,
        branchSummaries,
        finalAnswer
    };
}

// Helper: Count total nodes in a tree
function countNodes(node) {
    if (!node) return 0;
    return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

// Export for use in main HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        THINKING_MODES,
        generateThoughtTree,
        findBestLeaf,
        countNodes,
        selectInitialModes,
        summarizeBranch,
        generateFinalAnswer
    };
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.THINKING_MODES = THINKING_MODES;
    window.generateThoughtTree = generateThoughtTree;
    window.findBestLeaf = findBestLeaf;
    window.countNodes = countNodes;
    window.selectInitialModes = selectInitialModes;
    window.summarizeBranch = summarizeBranch;
    window.generateFinalAnswer = generateFinalAnswer;
}
