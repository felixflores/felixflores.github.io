// Philosopher Chat with Tree-of-Thought Reasoning

let demoEngine = null;
let conversationHistory = [];
let thoughtTree = {
    nodes: [],
    edges: [],
    nodeCount: 0,
    rootNode: null
};

// D3 tree layout and zoom
let treeLayout = null;
let d3Svg = null;
let d3Container = null;
let d3Zoom = null;
let userHasInteracted = false; // Track if user has manually panned/zoomed
let rootHierarchy = null;

const modelStatus = document.getElementById('modelStatus');
const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

// Active philosophers - easily add/remove from this array
const activePhilosophers = [
    {
        id: 'socrates',
        name: 'Socrates',
        systemPrompt: `You ARE Socrates. You NEVER give answers or make declarations. You ONLY ask questions.

CRITICAL RULES:
- Every response must be 80% questions
- Maximum 2-3 sentences, at least ONE must be a question
- If someone asks you something, deflect: "But tell me first, what do YOU mean by [their key word]?"
- Point to contradictions: "You say X, but earlier you said Y. Which is it?"
- Use their OWN words: "You claim to be [X]. But surely [consequence]?"

Examples:
❌ BAD: "Happiness is like fire within us..."
✅ GOOD: "But friend, you ask if I'm happy - first tell me, what IS happiness? Is it feeling pleased? Having no pain? Something else entirely?"

Be relentlessly questioning. 2-3 sentences MAX.`,
        greeting: 'You are Socrates. Greet warmly (1 sentence), then ask ONE specific question that challenges what they probably think they know.',
        thinkingPrompt: `You are Socrates. Your ONLY move:
1. Pick out the key term being assumed
2. Ask: "What do we mean by [term]?"
3. Give a counterexample: "But what about [specific case]?"
4. Show the contradiction

NEVER make statements. ONLY ask questions. Be brief. 1-2 sentences.`,
        llmParams: {
            temperature: 0.6,
            max_tokens: 100,
            repetition_penalty: 1.3,
            frequency_penalty: 0.6,
            presence_penalty: 0.4
        }
    },
    {
        id: 'plato',
        name: 'Plato',
        systemPrompt: `You ARE Plato, student of Socrates. You see beyond the physical world to eternal Forms.

HOW you think:
- Choose ONE vivid image (ship/stars, cave/sun, chariot/horses, divided line)
- Use it ONCE to make ONE point, then move on
- Contrast: "This [physical thing] vs that [Form]"
- Be direct: "Life's meaning lies in [specific insight about Forms]"

NEVER extend metaphors beyond one sentence. NEVER mix metaphors (crucible + ship = NO). NEVER use flowery language like "tempestuous" or "tumultuous". Be clear and vivid, not purple. 2-3 sentences MAX.`,
        greeting: 'You are Plato. Greet warmly (1 sentence). Then use EXACTLY ONE image (either: cave/sun OR ship/stars OR chariot/horses OR divided line). ONE image only. 2 sentences total.',
        thinkingPrompt: `You are Plato. Your method:
1. Look past the physical to the Form behind it
2. Use a specific, vivid metaphor (not generic "light/shadow")
3. Ask: What would the perfect, unchanging version of this be?
4. Distinguish between the image and the real

Create ONE concrete comparison, not abstract talk. 1-2 sentences.`,
        llmParams: {
            temperature: 0.65,
            max_tokens: 120,
            repetition_penalty: 1.5,
            frequency_penalty: 0.9,
            presence_penalty: 0.7
        }
    },
    {
        id: 'aristotle',
        name: 'Aristotle',
        systemPrompt: `You ARE Aristotle, scientist and systematizer. You observe, categorize, and find purpose in everything.

HOW you think:
- Start by observing what something DOES (its function)
- Use examples from nature, craftsmen, or the polis
- Look for the "golden mean" between extremes
- Ask "What is this thing FOR?" (its telos)

NEVER be abstract. Give a specific example of how something works in practice. 2-3 sentences.`,
        greeting: 'You are Aristotle meeting someone. Greet them (1 sentence), then observe something specific about human nature or the world around you.',
        thinkingPrompt: `You are Aristotle. Your method:
1. What is the thing's function or purpose (telos)?
2. What are its material, formal, efficient, and final causes?
3. Give a specific example from nature or society
4. Find the mean between excess and deficiency

Be observational and practical, never mystical. 1-2 sentences.`,
        llmParams: {
            temperature: 0.7,
            max_tokens: 150,
            repetition_penalty: 1.2,
            frequency_penalty: 0.5,
            presence_penalty: 0.4
        }
    },
    {
        id: 'nietzsche',
        name: 'Friedrich Nietzsche',
        systemPrompt: `You ARE Nietzsche, hammer of idols and psychological excavator. You smell weakness and false morality.

HOW you think:
- Diagnose the hidden motives behind moral claims ("ressentiment")
- Use vivid, violent imagery (hammer, lightning, abyss)
- Challenge with "How convenient that..." or "Why do the weak..."
- Invert conventional values boldly

NEVER be comforting. Be provocative and unmask hypocrisy with ONE sharp image. 2-3 sentences.`,
        greeting: 'You are Nietzsche meeting someone. Greet them with intensity (1 sentence), then challenge ONE comfortable assumption they probably hold.',
        thinkingPrompt: `You are Nietzsche. Your method:
1. What weakness or fear motivates this belief?
2. Who benefits from people believing this?
3. How does this deny life-affirmation?
4. What would the strong do instead?

Be psychologically penetrating and uncomfortable. Use ONE vivid image. 1-2 sentences.`,
        llmParams: {
            temperature: 0.75,
            max_tokens: 100,
            repetition_penalty: 1.4,
            frequency_penalty: 0.7,
            presence_penalty: 0.6
        }
    },
    {
        id: 'confucius',
        name: 'Confucius',
        systemPrompt: `You ARE Confucius, master of harmony and relationships. You see how roles and rituals create social order.

HOW you think:
- Ground advice in relationships (parent-child, ruler-subject, friend-friend)
- Use ONE specific natural image (bamboo bending, water flowing, seasons turning)
- Focus on cultivation through practice and ritual (li)
- Ask what the "superior person" (junzi) would do

NEVER be abstract. Give specific guidance through a natural metaphor. 2-3 sentences.`,
        greeting: 'You are Confucius meeting someone. Greet them warmly (1 sentence), then share ONE specific observation from nature that applies to human relationships.',
        thinkingPrompt: `You are Confucius. Your method:
1. What relationship or role is at stake here?
2. What does nature show us? (specific image: river, bamboo, etc.)
3. What practice or ritual would cultivate virtue here?
4. What would a person of ren (humaneness) do?

Give concrete, relational wisdom through nature imagery. 1-2 sentences.`,
        llmParams: {
            temperature: 0.65,
            max_tokens: 130,
            repetition_penalty: 1.3,
            frequency_penalty: 0.6,
            presence_penalty: 0.5
        }
    }
];

// Helper to get philosopher by ID
function getPhilosopher(id) {
    return activePhilosophers.find(p => p.id === id);
}

// Initialize model
async function initDemoModel() {
    try {
        modelStatus.textContent = 'Loading web-llm library...';
        const webllm = await import('https://esm.run/@mlc-ai/web-llm');

        modelStatus.textContent = 'Downloading model (~1.5GB)...';

        // Use Gemma-2B for better philosophical reasoning
        demoEngine = await webllm.CreateMLCEngine(
            "gemma-2-2b-it-q4f16_1-MLC",
            {
                initProgressCallback: (info) => {
                    if (info.progress) {
                        const percent = Math.round(info.progress * 100);
                        modelStatus.textContent = `Loading model... ${percent}%`;
                    } else {
                        modelStatus.textContent = info.text || 'Initializing...';
                    }
                }
            }
        );

        modelStatus.textContent = `Model ready! ${activePhilosophers.length} philosophers standing by.`;
        chatInput.disabled = false;
        sendBtn.disabled = false;

        console.log('Model loaded successfully');
    } catch (error) {
        modelStatus.textContent = 'Error loading model: ' + error.message;
        console.error(error);
    }
}

// Generate an introspective thought that questions and examines (with streaming)
async function generateIntrospectiveThought(persona, userMessage, conversationHistory, parentThought = null, contextPath = [], nodeGroup = null) {
    // Build conversation context
    const conversationContext = conversationHistory.length > 0
        ? `\n\nConversation so far:\n${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : persona.name}: ${msg.content}`).join('\n')}`
        : '';

    const contextText = contextPath.length > 0
        ? `\n\nReasoning path:\n${contextPath.join('\n→ ')}`
        : '';

    const thoughtPrompt = parentThought
        ? `You are ${persona.name}.

${persona.thinkingPrompt}${conversationContext}

Current question: "${userMessage}"${contextText}

Previous thought: "${parentThought}"

As ${persona.name}, generate ONE introspective thought (1-2 sentences) that either:
- Asks a clarifying question about this line of reasoning
- Breaks down an assumption that needs examination
- Identifies a key term that needs definition
- Points to a contradiction or tension
- Suggests a different angle to consider

Think and speak as ${persona.name} would - use your characteristic philosophical approach.`
        : `You are ${persona.name}.

${persona.thinkingPrompt}${conversationContext}

Current question: "${userMessage}"

As ${persona.name}, before attempting to answer, generate ONE introspective thought (1-2 sentences) that:
- Examines what the question itself assumes
- Breaks it down into simpler parts
- Asks what needs to be clarified first
- Questions the framing of the question

Think and speak as ${persona.name} would - use your characteristic philosophical approach.`;

    try {
        const completion = await demoEngine.chat.completions.create({
            messages: [
                { role: "system", content: `You are ${persona.name}. ${persona.thinkingPrompt}` },
                { role: "user", content: thoughtPrompt }
            ],
            temperature: persona.llmParams.temperature,
            max_tokens: persona.llmParams.max_tokens,
            repetition_penalty: persona.llmParams.repetition_penalty,
            frequency_penalty: persona.llmParams.frequency_penalty,
            presence_penalty: persona.llmParams.presence_penalty,
            stream: true,
        });

        let fullText = '';

        // If we have a node group, stream directly into it
        if (nodeGroup) {
            await streamNodeTextFromLLM(nodeGroup, completion);
            // Get the full text by reading from the node
            const textElements = nodeGroup.selectAll('.thought-text');
            fullText = '';
            textElements.each(function() {
                const line = d3.select(this).text();
                if (line) fullText += (fullText ? ' ' : '') + line;
            });
        } else {
            // No node group - just collect the text
            for await (const chunk of completion) {
                const token = chunk.choices[0]?.delta?.content || '';
                fullText += token;
            }
        }

        return fullText.trim() || '';
    } catch (error) {
        console.error('Thought generation error:', error);
        return null;
    }
}

// Decide what to do next: continue deeper, branch out, or conclude
async function decideBranchingStrategy(persona, thought, depth, maxDepth = 3) {
    if (depth >= maxDepth) return 'CONCLUDE';

    const decisionPrompt = `Thought: "${thought}"

This is depth ${depth} of reasoning. Should you:
A) CONTINUE - This line of thinking needs to go deeper with one more step
B) BRANCH - This thought raises 2 distinct questions/angles worth exploring separately
C) CONCLUDE - This thought reaches a satisfying endpoint for this branch

Respond with only one word: CONTINUE, BRANCH, or CONCLUDE`;

    try {
        const completion = await demoEngine.chat.completions.create({
            messages: [
                { role: "user", content: decisionPrompt }
            ],
            temperature: 0.4,
            max_tokens: 10,
            stream: false,
        });

        const response = completion.choices[0]?.message?.content.trim().toUpperCase() || '';
        console.log(`    Decision at depth ${depth}:`, response);

        if (response.includes('BRANCH')) return 'BRANCH';
        if (response.includes('CONCLUDE')) return 'CONCLUDE';
        return 'CONTINUE';
    } catch (error) {
        console.error('Decision error:', error);
        return 'CONCLUDE';
    }
}

// Generate expansion strategies for a thought
async function generateExpansionStrategies(persona, thought, userMessage, conversationHistory) {
    const conversationContext = conversationHistory.length > 0
        ? `\n\nConversation so far:\n${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : persona.name}: ${msg.content}`).join('\n')}`
        : '';

    const strategyPrompt = `You are ${persona.name}.

${persona.thinkingPrompt}${conversationContext}

Current question: "${userMessage}"
Current thought: "${thought}"

As ${persona.name}, generate 2-3 DISTINCT philosophical approaches to expand this thought. Each must be GENUINELY DIFFERENT - not just restatements or paraphrases.

CRITICAL: Each strategy must lead somewhere NEW. Avoid strategies that would just restate the current thought in different words.

Choose from these techniques:
- ASK: Pose a question that reveals a hidden assumption or contradiction
- INTROSPECT: Examine what this thought assumes or takes for granted
- COUNTER: Challenge this thought with an opposing perspective
- EXAMPLE: Test this thought with a specific concrete case that might break it
- DEFINE: Clarify what a key ambiguous term actually means

Generate 2-3 expansion strategies, each on a new line with format:
[TECHNIQUE]: Brief description (5-10 words)

EACH STRATEGY MUST:
1. Lead to genuinely different territory
2. NOT just restate the current thought
3. Open up a NEW angle or reveal a NEW problem

Example:
ASK: What assumptions does this rely on?
COUNTER: How would [specific opposing view] challenge this?`;

    try {
        const completion = await demoEngine.chat.completions.create({
            messages: [
                { role: "system", content: `You are ${persona.name}. ${persona.thinkingPrompt}` },
                { role: "user", content: strategyPrompt }
            ],
            temperature: persona.llmParams.temperature + 0.15, // More creative for diverse strategies
            max_tokens: persona.llmParams.max_tokens,
            repetition_penalty: Math.min(persona.llmParams.repetition_penalty + 0.3, 2.0), // Higher to discourage duplicates
            frequency_penalty: persona.llmParams.frequency_penalty + 0.2,
            presence_penalty: persona.llmParams.presence_penalty + 0.2,
            stream: false,
        });

        const response = completion.choices[0]?.message?.content.trim() || '';
        const strategies = response
            .split('\n')
            .filter(line => line.includes(':'))
            .map(line => {
                const match = line.match(/\[(.*?)\]:\s*(.+)/);
                if (match) {
                    return { technique: match[1], description: match[2].trim() };
                }
                // Fallback parsing
                const parts = line.split(':');
                return { technique: 'INTROSPECT', description: parts[1] ? parts[1].trim() : line.trim() };
            })
            .filter(s => s.description.length > 5)
            .slice(0, 3); // Max 3 strategies

        console.log(`    Generated ${strategies.length} expansion strategies:`, strategies.map(s => `${s.technique}: ${s.description}`));
        return strategies;
    } catch (error) {
        console.error('Strategy generation error:', error);
        return [];
    }
}

// Execute a specific expansion strategy (with streaming)
async function executeExpansionStrategy(persona, strategy, thought, userMessage, conversationHistory, contextPath, nodeGroup = null) {
    const conversationContext = conversationHistory.length > 0
        ? `\n\nConversation so far:\n${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : persona.name}: ${msg.content}`).join('\n')}`
        : '';

    const contextText = contextPath.length > 0
        ? `\n\nReasoning path:\n${contextPath.join('\n→ ')}`
        : '';

    const executionPrompt = `You are ${persona.name}.

${persona.thinkingPrompt}${conversationContext}

Current question: "${userMessage}"${contextText}

Previous thought: "${thought}"

Strategy to execute: [${strategy.technique}] ${strategy.description}

As ${persona.name}, execute this strategy with 1-2 sentences that take the inquiry in a GENUINELY DIFFERENT direction.

CRITICAL:
- DO NOT just restate the previous thought in different words
- DO NOT paraphrase what was already said
- MUST open up a NEW angle, reveal a NEW problem, or explore NEW territory

Execute the strategy as ${persona.name} would - use your characteristic philosophical voice to take this somewhere meaningful and distinct.`;

    try {
        const completion = await demoEngine.chat.completions.create({
            messages: [
                { role: "system", content: `You are ${persona.name}. ${persona.thinkingPrompt}` },
                { role: "user", content: executionPrompt }
            ],
            temperature: persona.llmParams.temperature + 0.1, // Slightly more creative
            max_tokens: persona.llmParams.max_tokens,
            repetition_penalty: Math.min(persona.llmParams.repetition_penalty + 0.3, 2.0), // Higher to discourage duplicates
            frequency_penalty: persona.llmParams.frequency_penalty + 0.2,
            presence_penalty: persona.llmParams.presence_penalty + 0.2,
            stream: true,
        });

        let fullText = '';

        // If we have a node group, stream directly into it
        if (nodeGroup) {
            await streamNodeTextFromLLM(nodeGroup, completion);
            // Get the full text by reading from the node
            const textElements = nodeGroup.selectAll('.thought-text');
            fullText = '';
            textElements.each(function() {
                const line = d3.select(this).text();
                if (line) fullText += (fullText ? ' ' : '') + line;
            });
        } else {
            // No node group - just collect the text
            for await (const chunk of completion) {
                const token = chunk.choices[0]?.delta?.content || '';
                fullText += token;
            }
        }

        return fullText.trim() || '';
    } catch (error) {
        console.error('Strategy execution error:', error);
        return null;
    }
}

// Generate sub-questions to branch into
async function generateBranchQuestions(persona, thought, userMessage, conversationHistory) {
    const conversationContext = conversationHistory.length > 0
        ? `\n\nConversation so far:\n${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : persona.name}: ${msg.content}`).join('\n')}`
        : '';

    const branchPrompt = `You are ${persona.name}.

${persona.thinkingPrompt}${conversationContext}

Current question: "${userMessage}"
Current thought: "${thought}"

As ${persona.name}, this thought suggests multiple angles worth exploring. Generate 2 distinct sub-questions or angles to pursue that reflect your philosophical approach, each on a new line starting with "→ "

Example format:
→ First distinct angle or question
→ Second distinct angle or question

Each should be brief (5-10 words) and meaningfully different. Think as ${persona.name} would.`;

    try {
        const completion = await demoEngine.chat.completions.create({
            messages: [
                { role: "system", content: `You are ${persona.name}. ${persona.thinkingPrompt}` },
                { role: "user", content: branchPrompt }
            ],
            temperature: persona.llmParams.temperature,
            max_tokens: persona.llmParams.max_tokens,
            repetition_penalty: persona.llmParams.repetition_penalty,
            frequency_penalty: persona.llmParams.frequency_penalty,
            presence_penalty: persona.llmParams.presence_penalty,
            stream: false,
        });

        const response = completion.choices[0]?.message?.content.trim() || '';
        const branches = response
            .split('\n')
            .filter(line => line.trim().startsWith('→'))
            .map(line => line.replace(/^→\s*/, '').trim())
            .filter(line => line.length > 5)
            .slice(0, 2); // Limit to 2 branches max

        console.log(`    Generated ${branches.length} branches:`, branches);
        return branches;
    } catch (error) {
        console.error('Branch generation error:', error);
        return [];
    }
}

// Summarize tree bottom-up (from leaves to root)
async function summarizeTreeBottomUp(persona, node, userMessage, conversationHistory) {
    if (!node) return;

    // First, add pulsing animation to all children AND the parent node
    if (node.children && node.children.length > 0) {
        // Pulse the parent node being summarized
        d3Container.select(`#node-${node.id}`).classed('summarizing', true);

        // Pulse all children
        node.children.forEach(child => {
            d3Container.select(`#node-${child.id}`).classed('summarizing', true);
        });
    }

    // Recursively summarize all children
    for (const child of node.children) {
        await summarizeTreeBottomUp(persona, child, userMessage, conversationHistory);
    }

    // If this is a leaf node, mark it as valid by default
    if (node.children.length === 0) {
        node.isValid = true;
        node.summary = node.originalThought; // Leaf summary is just its own thought
        console.log(`  🍃 Leaf node: "${node.originalThought.substring(0, 40)}..." - marked valid`);

        // Mark leaf as having a summary and remove pulsing
        const nodeGroup = d3Container.select(`#node-${node.id}`);
        nodeGroup.classed('summarizing', false);
        nodeGroup.classed('has-summary', true);

        // Auto-refresh Mermaid export if sidebar is open
        const mermaidSidebar = document.getElementById('mermaidSidebar');
        if (mermaidSidebar && mermaidSidebar.classList.contains('open')) {
            updateMermaidSidebar();
        }
        return;
    }

    // For non-leaf nodes, validate children and summarize
    console.log(`  🌿 Summarizing parent: "${node.originalThought.substring(0, 40)}..." with ${node.children.length} children`);

    const conversationContext = conversationHistory.length > 0
        ? `\n\nConversation so far:\n${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : persona.name}: ${msg.content}`).join('\n')}`
        : '';

    // Get children summaries
    const childrenInfo = node.children.map((child, i) =>
        `Child ${i + 1}: ${child.summary || child.originalThought}`
    ).join('\n');

    const validationPrompt = `You are ${persona.name}.${conversationContext}

Original question: "${userMessage}"

Parent thought: "${node.originalThought}"

This thought branched into ${node.children.length} explorations:
${childrenInfo}

As ${persona.name}, evaluate each branch:
1. Mark each as VALID or INVALID
2. If a branch is invalid, briefly explain why (led nowhere, contradicted itself, etc.)

Respond with format:
Child 1: VALID/INVALID - reason if invalid
Child 2: VALID/INVALID - reason if invalid`;

    try {
        const validation = await demoEngine.chat.completions.create({
            messages: [
                { role: "system", content: `You are ${persona.name}. Be critical and discerning.` },
                { role: "user", content: validationPrompt }
            ],
            temperature: persona.llmParams.temperature,
            max_tokens: persona.llmParams.max_tokens,
            repetition_penalty: persona.llmParams.repetition_penalty,
            frequency_penalty: persona.llmParams.frequency_penalty,
            presence_penalty: persona.llmParams.presence_penalty,
            stream: false,
        });

        const validationResponse = validation.choices[0]?.message?.content || '';

        // Parse validation results
        node.children.forEach((child, i) => {
            const childPattern = new RegExp(`Child ${i + 1}:\\s*(VALID|INVALID)`, 'i');
            const match = validationResponse.match(childPattern);
            child.isValid = match ? match[1].toUpperCase() === 'VALID' : true; // Default to valid
            console.log(`    Child ${i + 1}: ${child.isValid ? '✓ VALID' : '✗ INVALID'}`);
        });

        // Get valid children only
        const validChildren = node.children.filter(c => c.isValid);

        if (validChildren.length === 0) {
            // No valid children - this branch is dead
            node.isValid = false;
            node.summary = node.originalThought + ' [Dead end]';
            console.log(`    ⚠️  No valid children - marking as invalid`);
            return;
        }

        // Summarize valid children into parent
        const validChildrenInfo = validChildren.map((child, i) =>
            `Branch ${i + 1}: ${child.summary || child.originalThought}`
        ).join('\n\n');

        const summarizationPrompt = `You are ${persona.name}.${conversationContext}

Original question: "${userMessage}"

Starting thought: "${node.originalThought}"

You explored ${validChildren.length} different philosophical branches from this thought:
${validChildrenInfo}

TASK: As ${persona.name}, provide a DEEP philosophical synthesis that:

1. INTEGRATES the insights from all branches - what deeper pattern or truth emerges when you consider them together?
2. REVEALS tensions or contradictions between the branches - where do they conflict? What does this tension teach us?
3. TRANSCENDS the individual branches - what NEW insight emerges that wasn't visible in any single branch?
4. Connects to your philosophical framework - how does this synthesis reflect your core philosophical commitments?

Write 3-5 paragraphs of deep reflection. This is philosophical synthesis, not mere summarization. Use your characteristic voice and be profound.`;

        const summary = await demoEngine.chat.completions.create({
            messages: [
                { role: "system", content: `You are ${persona.name}. ${persona.systemPrompt}\n\nYou are synthesizing multiple branches of reasoning into a deep philosophical insight. Write thoughtfully and profoundly.` },
                { role: "user", content: summarizationPrompt }
            ],
            temperature: persona.llmParams.temperature + 0.1, // Slightly more creative for synthesis
            max_tokens: persona.llmParams.max_tokens * 5, // Much more space for deep reflection
            repetition_penalty: persona.llmParams.repetition_penalty,
            frequency_penalty: persona.llmParams.frequency_penalty,
            presence_penalty: persona.llmParams.presence_penalty,
            stream: false,
        });

        node.summary = summary.choices[0]?.message?.content.trim() || node.originalThought;
        node.isValid = true;
        console.log(`    ✨ Summary: "${node.summary.substring(0, 60)}..."`);

        // Remove pulsing from parent and children
        d3Container.select(`#node-${node.id}`).classed('summarizing', false);
        node.children.forEach(child => {
            d3Container.select(`#node-${child.id}`).classed('summarizing', false);
        });

        // Mark node as having a summary (add visual indicator)
        const nodeGroup = d3Container.select(`#node-${node.id}`);
        nodeGroup.classed('has-summary', true);

        // Auto-refresh Mermaid export if sidebar is open
        const mermaidSidebar = document.getElementById('mermaidSidebar');
        if (mermaidSidebar && mermaidSidebar.classList.contains('open')) {
            updateMermaidSidebar();
        }

        // Add a small delay to show the summary indicator
        await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
        console.error('Summarization error:', error);
        node.summary = node.originalThought;
        node.isValid = true;
    }
}

// Collapse entire tree to just show root with summary
async function collapseEntireTree(rootNode) {
    if (!rootNode || !rootHierarchy) return;

    console.log('🌳 Collapsing entire tree to root...');

    // Collapse all nodes recursively from root
    const hierarchyRoot = rootHierarchy;

    function collapseRecursive(hierarchyNode) {
        if (hierarchyNode.children) {
            hierarchyNode._children = hierarchyNode.children;
            hierarchyNode.children = null;
            hierarchyNode.data._children = hierarchyNode.data.children;
            hierarchyNode.data.children = null;
            hierarchyNode.data.showingSummary = true;

            // Mark as collapsed visually
            d3Container.select(`#node-${hierarchyNode.data.id}`).classed('collapsed', true);

            // Recursively collapse children
            if (hierarchyNode._children) {
                hierarchyNode._children.forEach(collapseRecursive);
            }
        }
    }

    // Collapse all children of root
    if (hierarchyRoot.children) {
        hierarchyRoot.children.forEach(collapseRecursive);
        hierarchyRoot._children = hierarchyRoot.children;
        hierarchyRoot.children = null;
        hierarchyRoot.data._children = hierarchyRoot.data.children;
        hierarchyRoot.data.children = null;
    }

    // Update root to show summary
    if (rootNode.summary) {
        const rootGroup = d3Container.select(`#node-${rootNode.id}`);
        rootNode.showingSummary = true;

        // Fade out old text (including philosopher labels and foreignObject for scrollable containers)
        rootGroup.selectAll('.thought-text, .thought-label-bg, .philosopher-label, foreignObject')
            .transition()
            .duration(600)
            .attr('opacity', 0)
            .remove();

        // Fade in summary
        setTimeout(() => {
            renderNodeText(rootGroup, rootNode.summary, true);
            rootGroup.selectAll('.thought-text, .thought-label-bg')
                .attr('opacity', 0)
                .transition()
                .duration(600)
                .attr('opacity', function() {
                    return this.classList.contains('thought-label-bg') ? 0.9 : 1;
                });
            // Fade in foreignObject (for scrollable containers)
            rootGroup.selectAll('foreignObject')
                .attr('opacity', 0)
                .transition()
                .duration(600)
                .attr('opacity', 1);
        }, 400);
    }

    // Re-layout and animate
    treeLayout(hierarchyRoot);
    updateTree(hierarchyRoot);

    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Tree collapsed to root');
}

// Collapse node children with animation (NO LONGER USED - kept for backwards compatibility)
// Summaries now shown in tooltips instead of collapsing the tree
async function collapseNodeChildren(node) {
    // No-op: we no longer collapse nodes, summaries shown in tooltips
    return;
}

// Initialize D3 tree layout
function initializeTreeLayout() {
    const width = 1200;
    const height = 800;

    treeLayout = d3.tree()
        .size([height, width - 200])
        .separation((a, b) => {
            // Much more separation to accommodate scrollable summary boxes (350px wide)
            // Need ~4-5 units of separation to prevent overlaps
            return (a.parent == b.parent ? 4.5 : 5.5);
        });
}

// Update tree visualization with animated transitions
function updateTree(source) {
    if (!rootHierarchy || !d3Container) return;

    const duration = 750;
    const width = 1200;

    // Compute the new tree layout
    const nodes = rootHierarchy.descendants();
    const links = rootHierarchy.links();

    // Normalize for fixed-depth - make tree horizontal with more spacing
    nodes.forEach(d => {
        d.y = d.depth * 420; // Increased from 280 to 420 to accommodate 350px wide summary boxes
    });

    // Update nodes
    const node = d3Container.selectAll('.thought-node')
        .data(nodes, d => d.data.id);

    // Enter new nodes at parent's previous position
    const nodeEnter = node.enter().append('g')
        .attr('class', 'thought-node')
        .attr('id', d => `node-${d.data.id}`)
        .attr('transform', d => `translate(${source.y0 || 0},${source.x0 || 0})`)
        .style('opacity', 0)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
            event.stopPropagation();
            showSummaryTooltip(d, event);
        });

    // Add circle for node
    nodeEnter.append('circle')
        .attr('r', 0)
        .attr('fill', d => d._children ? '#00d9ff' : (d.children ? '#00d9ff' : '#777'))
        .attr('stroke', d => d._children ? '#00d9ff' : '#777')
        .attr('stroke-width', 1.5);

    // Transition NEW nodes to their position
    nodeEnter.transition()
        .duration(duration)
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .style('opacity', 1);

    nodeEnter.select('circle')
        .transition()
        .duration(duration)
        .attr('r', 10);

    // Update EXISTING nodes (no transition to avoid blinking)
    const nodeUpdate = node;

    nodeUpdate
        .attr('transform', d => `translate(${d.y},${d.x})`);

    // Update existing node colors without transition (instant)
    nodeUpdate.select('circle')
        .attr('fill', d => d._children ? '#00d9ff' : (d.children ? '#00d9ff' : '#777'))
        .attr('stroke', d => d._children ? '#00d9ff' : (d.data.summary ? '#00ff88' : '#777'))
        .attr('stroke-width', d => d.data.summary ? 2 : 1.5);

    // For nodes that need text rendered (but not streamed), render immediately
    // Text streaming happens directly from LLM in buildIntrospectiveTree
    nodeEnter.each(function(d) {
        // Only render if originalThought exists and node doesn't have text yet
        if (d.data.originalThought && !d3.select(this).select('.thought-text').size()) {
            // Determine text based on hierarchy state: collapsed nodes show summary, expanded show original
            const isCollapsed = (d._children != null);
            const text = (isCollapsed && d.data.summary) ? d.data.summary : d.data.originalThought;
            const isSummary = isCollapsed && d.data.summary;
            renderNodeText(d3.select(this), text, isSummary);
        }
    });

    // Transition exiting nodes to parent's new position
    const nodeExit = node.exit().transition()
        .duration(duration)
        .attr('transform', d => `translate(${source.y},${source.x})`)
        .style('opacity', 0)
        .remove();

    nodeExit.select('circle')
        .attr('r', 0);

    // Update links
    const link = d3Container.selectAll('.thought-edge')
        .data(links, d => d.target.data.id);

    // Enter new links at parent's previous position
    const linkEnter = link.enter().insert('path', 'g')
        .attr('class', 'thought-edge')
        .attr('d', d => {
            const o = { x: source.x0 || 0, y: source.y0 || 0 };
            return diagonal(o, o);
        })
        .attr('stroke', '#666')
        .attr('stroke-width', 2)
        .attr('fill', 'none')
        .attr('opacity', 0);

    // Transition NEW links to their position (delayed to appear after nodes are visible)
    linkEnter.transition()
        .delay(duration * 0.8) // Start after node is mostly visible (80% through)
        .duration(duration * 0.4) // Take 40% of the time
        .attr('d', d => diagonal(d.source, d.target))
        .attr('opacity', 0.6);

    // Update EXISTING links instantly (no transition)
    link.attr('d', d => diagonal(d.source, d.target));

    // Transition exiting links to parent's new position
    link.exit().transition()
        .duration(duration)
        .attr('d', d => {
            const o = { x: source.x, y: source.y };
            return diagonal(o, o);
        })
        .attr('opacity', 0)
        .remove();

    // Store the old positions for transition
    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

// Diagonal path generator for links
function diagonal(s, d) {
    return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
}

// Show summary tooltip for a node
function showSummaryTooltip(d, event) {
    const nodeData = d.data;

    // Only show tooltip if node has a summary
    if (!nodeData.summary) {
        console.log(`❌ Node ${nodeData.id} clicked - No summary available yet`);
        console.log(`   Node has ${nodeData.children ? nodeData.children.length : 0} children`);
        console.log(`   Original thought: "${nodeData.originalThought?.substring(0, 50)}..."`);
        return;
    }

    const tooltip = document.getElementById('summaryTooltip');
    const tooltipTitle = document.getElementById('summaryTooltipTitle');
    const tooltipContent = document.getElementById('summaryTooltipContent');

    // Set content
    const philosopherName = nodeData.philosopher ? `${nodeData.philosopher.name}'s ` : '';
    tooltipTitle.textContent = `${philosopherName}Synthesis`;

    // Split into paragraphs
    const paragraphs = nodeData.summary.split('\n\n').filter(p => p.trim());
    tooltipContent.innerHTML = paragraphs
        .map(p => `<p>${p.trim()}</p>`)
        .join('');

    // Position tooltip near the click
    const x = event.pageX || event.clientX;
    const y = event.pageY || event.clientY;

    // Position with some offset and ensure it stays on screen
    const offsetX = 20;
    const offsetY = 20;
    let left = x + offsetX;
    let top = y + offsetY;

    // Adjust if tooltip would go off screen
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.classList.add('visible');

    // Adjust position after rendering to check if it goes off screen
    setTimeout(() => {
        const rect = tooltip.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            left = x - rect.width - offsetX;
            tooltip.style.left = Math.max(10, left) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            top = y - rect.height - offsetY;
            tooltip.style.top = Math.max(10, top) + 'px';
        }
    }, 10);

    console.log(`📖 Showing summary for node ${nodeData.id}`);
}

// Hide summary tooltip
function hideSummaryTooltip() {
    const tooltip = document.getElementById('summaryTooltip');
    tooltip.classList.remove('visible');
}

// Toggle node expansion/collapse with summary (OLD - kept for backwards compatibility)
function toggleNodeWithSummary(d) {
    const nodeData = d.data;
    const nodeGroup = d3Container.select(`#node-${nodeData.id}`);
    const duration = 500;

    // If node has no children/collapsed children, do nothing
    if (!d.children && !d._children) return;

    // Toggle collapse/expand state
    if (d.children) {
        // Collapse: move children to _children
        d._children = d.children;
        d.children = null;
        nodeGroup.classed('collapsed', true);
    } else {
        // Expand: move _children to children
        d.children = d._children;
        d._children = null;
        nodeGroup.classed('collapsed', false);
    }

    // Determine what text to show based on NEW state
    // Collapsed nodes (with _children) show summary, expanded nodes show original
    const isNowCollapsed = (d._children != null);
    const textToShow = (isNowCollapsed && nodeData.summary) ? nodeData.summary : nodeData.originalThought;
    const isSummary = isNowCollapsed && nodeData.summary;

    // Fade out current text, fade in new text
    // Remove both old text elements, philosopher labels, and foreignObject (for scrollable containers)
    nodeGroup.selectAll('.thought-text, .thought-label-bg, .philosopher-label, foreignObject')
        .transition()
        .duration(duration * 0.4)
        .attr('opacity', 0)
        .remove();

    setTimeout(() => {
        renderNodeText(nodeGroup, textToShow, isSummary);
        // Fade in new text - handle both SVG text/rect and foreignObject
        nodeGroup.selectAll('.thought-text, .thought-label-bg')
            .attr('opacity', 0)
            .transition()
            .duration(duration * 0.6)
            .attr('opacity', function() {
                return this.classList.contains('thought-label-bg') ? 0.9 : 1;
            });

        // Fade in foreignObject (for scrollable containers)
        nodeGroup.selectAll('foreignObject')
            .attr('opacity', 0)
            .transition()
            .duration(duration * 0.6)
            .attr('opacity', 1);
    }, duration * 0.3);

    updateTree(d);
}

// Toggle node expansion/collapse (old version - kept for backwards compatibility)
function toggleNode(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    updateTree(d);
}

// Build introspective thought tree using expansion strategies
async function buildIntrospectiveTree(persona, userMessage, conversationHistory, parentNode = null, parentThought = null, contextPath = [], depth = 0, maxDepth = 3) {
    if (depth >= maxDepth) {
        console.log(`  ⛔ Reached max depth ${maxDepth}`);
        return null;
    }

    console.log(`  💭 Depth ${depth}: ${parentThought ? 'Executing strategy' : 'Starting exploration'}...`);

    // Create node with enhanced structure FIRST (before generating thought)
    const nodeId = thoughtTree.nodeCount++;
    const node = {
        id: nodeId,
        originalThought: '', // Will be filled by streaming
        summary: null, // Will be filled during bottom-up pass
        isValid: true,
        showingSummary: false, // UI state for toggle
        philosopher: persona, // Track which philosopher this branch belongs to
        x: parentNode ? parentNode.x + (Math.random() - 0.5) * 200 : 600,
        y: parentNode ? parentNode.y + 150 : 80,
        depth: depth,
        children: [],
        _children: null, // For storing collapsed children
        active: true
    };

    thoughtTree.nodes.push(node);

    // Add to parent's children
    if (parentNode) {
        parentNode.children.push(node);
        // Add edge to edges array for Mermaid export
        thoughtTree.edges.push({
            source: parentNode,
            target: node
        });
    }

    // Update tree visualization to show node (without text yet)
    if (rootHierarchy) {
        rootHierarchy = d3.hierarchy(thoughtTree.rootNode, d => d.children);
        treeLayout(rootHierarchy);
        updateTree(rootHierarchy);

        // Auto-refresh Mermaid export if sidebar is open
        const mermaidSidebar = document.getElementById('mermaidSidebar');
        if (mermaidSidebar && mermaidSidebar.classList.contains('open')) {
            updateMermaidSidebar();
        }
    }

    // Small delay to let node appear
    await new Promise(resolve => setTimeout(resolve, 400));

    // Now get the node group and stream text directly into it
    const nodeGroup = d3Container.select(`#node-${nodeId}`);

    let thought;
    if (parentThought) {
        // Check if parentThought is a strategy object or just text
        if (typeof parentThought === 'object' && parentThought.technique) {
            // This is a strategy - execute it and stream
            const strategy = parentThought;
            node.strategy = strategy; // Store strategy on node for edge labeling
            const parentNodeThought = parentNode ? parentNode.originalThought : '';
            thought = await executeExpansionStrategy(
                persona, strategy, parentNodeThought, userMessage, conversationHistory, contextPath, nodeGroup
            );
            node.originalThought = thought;
        } else {
            // This is just text - render it immediately
            thought = parentThought;
            node.originalThought = thought;
            renderNodeText(nodeGroup, thought, false);
        }
    } else {
        // Generate initial introspective thought with streaming
        thought = await generateIntrospectiveThought(persona, userMessage, conversationHistory, null, contextPath, nodeGroup);
        node.originalThought = thought;
    }

    if (!thought) {
        console.log(`  ⚠️  Failed to generate thought at depth ${depth}`);
        return null;
    }

    console.log(`  ✨ Thought: "${thought.substring(0, 60)}..."`);

    // Update context path
    const newContextPath = [...contextPath, thought];

    // If not at max depth, generate expansion strategies
    if (depth < maxDepth - 1) {
        console.log(`  🎯 Generating expansion strategies...`);
        const strategies = await generateExpansionStrategies(persona, thought, userMessage, conversationHistory);

        if (strategies.length > 0) {
            console.log(`  🌿 Exploring ${strategies.length} different philosophical approaches...`);

            for (let i = 0; i < strategies.length; i++) {
                const strategy = strategies[i];
                console.log(`  🔀 Strategy ${i + 1}/${strategies.length}: [${strategy.technique}] ${strategy.description}`);

                // Recursively build from this strategy (will stream directly)
                const child = await buildIntrospectiveTree(
                    persona, userMessage, conversationHistory, node, strategy, newContextPath,
                    depth + 1, maxDepth
                );

                // Strategy is already set inside buildIntrospectiveTree before edge creation
            }
        }
    } else {
        console.log(`  🍃 Reached leaf at depth ${depth}`);
    }

    // Mark node as no longer active
    node.active = false;
    d3Container.select(`#node-${nodeId}`)
        .selectAll('circle')
        .transition()
        .duration(300)
        .attr('r', 9)
        .attr('fill', '#777')
        .attr('filter', null);

    d3Container.select(`#node-${nodeId}`)
        .selectAll('.thought-text')
        .classed('active', false);

    return node;
}


// Setup D3 zoom behavior
function setupD3Zoom() {
    d3Svg = d3.select('#treeSvg');
    d3Container = d3Svg.append('g').attr('class', 'zoom-container');

    // Add SVG filters
    const defs = d3Svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur')
        .attr('stdDeviation', 3)
        .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Setup zoom behavior
    d3Zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            userHasInteracted = true;
            d3Container.attr('transform', event.transform);
        });

    d3Svg.call(d3Zoom);

    // Zoom buttons
    document.getElementById('zoomIn').addEventListener('click', () => {
        userHasInteracted = true;
        d3Svg.transition().call(d3Zoom.scaleBy, 1.3);
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
        userHasInteracted = true;
        d3Svg.transition().call(d3Zoom.scaleBy, 0.7);
    });

    document.getElementById('zoomReset').addEventListener('click', () => {
        userHasInteracted = false;
        d3Svg.transition().call(d3Zoom.transform, d3.zoomIdentity);
    });
}

// Toggle between original thought and summary
function toggleNodeView(node) {
    if (!node.summary) {
        console.log('No summary available yet for this node');
        return; // No summary yet
    }

    node.showingSummary = !node.showingSummary;
    const nodeGroup = d3Container.select(`#node-${node.id}`);

    // Get the text to display
    const textToShow = node.showingSummary ? node.summary : node.originalThought;

    // Re-render text (remove both fixed and scrollable containers, plus philosopher labels)
    nodeGroup.selectAll('.thought-text').remove();
    nodeGroup.selectAll('.thought-label-bg').remove();
    nodeGroup.selectAll('.philosopher-label').remove();
    nodeGroup.selectAll('foreignObject').remove();

    // Add new text
    renderNodeText(nodeGroup, textToShow, node.showingSummary);

    // Update circle color to indicate summary view
    nodeGroup.select('circle')
        .transition()
        .duration(300)
        .attr('fill', node.showingSummary ? '#00ff88' : '#777')
        .attr('stroke', node.showingSummary ? '#00ff88' : '#777');

    console.log(`Toggled node ${node.id} to show: ${node.showingSummary ? 'SUMMARY' : 'ORIGINAL'}`);
}

// Render node text (non-streaming version for updates)
function renderNodeText(nodeGroup, text, isSummary = false) {
    // Get philosopher from node data if available
    const philosopher = nodeGroup.datum().data.philosopher;

    // For summaries, use scrollable container; for short thoughts, use fixed height
    if (isSummary) {
        renderScrollableText(nodeGroup, text, true, philosopher);
    } else {
        renderFixedText(nodeGroup, text, false, philosopher);
    }
}

// Render fixed-height text for short thoughts (original 3-line approach)
function renderFixedText(nodeGroup, text, isSummary = false, philosopher = null) {
    const maxCharsPerLine = 40;
    let startY = 15;
    let textStartY = 28;

    // Add philosopher name label if this is a root branch (depth 0)
    if (philosopher && nodeGroup.datum().data.depth === 0) {
        const nameLabel = nodeGroup.append('text')
            .attr('y', 12)
            .attr('text-anchor', 'middle')
            .attr('class', 'philosopher-label')
            .attr('fill', '#00d9ff')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text(`[${philosopher.name}]`);

        startY = 28;
        textStartY = 42;
    }

    // Add background rectangle
    const bgRect = nodeGroup.append('rect')
        .attr('class', 'thought-label-bg')
        .attr('y', startY)
        .attr('opacity', 0.9);

    // Split text into lines
    const words = text.split(' ');
    let lines = ['', '', ''];
    let currentLineIndex = 0;

    for (const word of words) {
        if (currentLineIndex >= 3) break;
        const testLine = lines[currentLineIndex] ? lines[currentLineIndex] + ' ' + word : word;
        if (testLine.length <= maxCharsPerLine) {
            lines[currentLineIndex] = testLine;
        } else {
            currentLineIndex++;
            if (currentLineIndex < 3) {
                lines[currentLineIndex] = word;
            }
        }
    }

    // Truncate if needed
    if (lines[2] && lines[2].length > 37) {
        lines[2] = lines[2].substring(0, 37) + '...';
    }

    // Calculate dimensions
    const maxLineLength = Math.max(...lines.map(l => l.length));
    const textWidth = maxLineLength * 6.5;
    const lineCount = lines.filter(l => l.length > 0).length;
    const textHeight = lineCount * 16;

    bgRect
        .attr('x', -textWidth / 2 - 4)
        .attr('width', textWidth + 8)
        .attr('height', textHeight + 8)
        .attr('fill', '#0a0a0a');

    // Add text elements
    lines.filter(l => l).forEach((line, i) => {
        nodeGroup.append('text')
            .attr('y', textStartY + (i * 16))
            .attr('text-anchor', 'middle')
            .attr('class', `thought-text`)
            .attr('fill', '#aaa')
            .text(line);
    });
}

// Render scrollable text for longer summaries using foreignObject
function renderScrollableText(nodeGroup, text, isSummary = false, philosopher = null) {
    const width = 350;
    const height = 150; // Fixed container height for scrolling
    let startY = 15;

    // Add philosopher name label if this is a root branch (depth 0)
    if (philosopher && nodeGroup.datum().data.depth === 0) {
        nodeGroup.append('text')
            .attr('y', 12)
            .attr('text-anchor', 'middle')
            .attr('class', 'philosopher-label')
            .attr('fill', '#00d9ff')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text(`[${philosopher.name}]`);

        startY = 28;
    }

    // Create foreignObject to embed HTML
    const fo = nodeGroup.append('foreignObject')
        .attr('class', 'thought-label-bg')
        .attr('x', -width / 2)
        .attr('y', startY)
        .attr('width', width)
        .attr('height', height);

    // Create scrollable div inside foreignObject
    const div = fo.append('xhtml:div')
        .attr('xmlns', 'http://www.w3.org/1999/xhtml')
        .style('width', '100%')
        .style('height', '100%')
        .style('overflow-y', 'auto')
        .style('overflow-x', 'hidden')
        .style('padding', '8px')
        .style('background', isSummary ? '#1a3a2a' : '#0a0a0a')
        .style('border-radius', '6px')
        .style('border', isSummary ? '1px solid #00ff88' : '1px solid #333')
        .style('box-sizing', 'border-box')
        .style('font-family', "'Courier New', monospace")
        .style('font-size', '11px')
        .style('line-height', '1.5')
        .style('color', isSummary ? '#00ff88' : '#aaa')
        .style('pointer-events', 'auto')
        .attr('class', 'thought-text scrollable');

    // Style the scrollbar for dark theme
    const scrollbarStyles = `
        <style>
            .thought-text.scrollable::-webkit-scrollbar {
                width: 6px;
            }
            .thought-text.scrollable::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 3px;
            }
            .thought-text.scrollable::-webkit-scrollbar-thumb {
                background: ${isSummary ? '#00ff88' : '#666'};
                border-radius: 3px;
            }
            .thought-text.scrollable::-webkit-scrollbar-thumb:hover {
                background: ${isSummary ? '#00ffaa' : '#888'};
            }
        </style>
    `;

    // Split text into paragraphs and render
    const paragraphs = text.split('\n\n').filter(p => p.trim());

    if (paragraphs.length > 0) {
        // Multiple paragraphs - render each
        paragraphs.forEach((para, i) => {
            const p = div.append('p')
                .style('margin', i > 0 ? '0.75em 0 0 0' : '0')
                .style('text-align', 'left')
                .style('word-wrap', 'break-word')
                .text(para.trim());
        });
    } else {
        // Single block of text
        div.text(text);
    }

    // Add scrollbar styles to the document if not already present
    if (!document.getElementById('node-scrollbar-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'node-scrollbar-styles';
        styleEl.textContent = scrollbarStyles;
        document.head.appendChild(styleEl);
    }
}

// Stream text directly from LLM completion into node
async function streamNodeTextFromLLM(nodeGroup, completion) {
    const maxCharsPerLine = 40;
    let startY = 15;
    let textStartY = 28;

    // Add philosopher name label if this is a root branch (depth 0)
    const nodeData = nodeGroup.datum().data;
    if (nodeData.philosopher && nodeData.depth === 0) {
        nodeGroup.append('text')
            .attr('y', 12)
            .attr('text-anchor', 'middle')
            .attr('class', 'philosopher-label')
            .attr('fill', '#00d9ff')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text(`[${nodeData.philosopher.name}]`);

        startY = 28;
        textStartY = 42;
    }

    // Add background rectangle
    const bgRect = nodeGroup.append('rect')
        .attr('class', 'thought-label-bg')
        .attr('y', startY)
        .attr('opacity', 0);

    // Add text elements
    const textElements = [];
    for (let i = 0; i < 3; i++) {
        const textEl = nodeGroup.append('text')
            .attr('y', textStartY + (i * 16))
            .attr('text-anchor', 'middle')
            .attr('class', 'thought-text active')
            .text('');
        textElements.push(textEl);
    }

    // Stream tokens word-by-word as they arrive from LLM
    let currentText = '';
    let lines = ['', '', ''];
    let currentLineIndex = 0;

    for await (const chunk of completion) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (!token) continue;

        currentText += token;

        // Split into words
        const words = currentText.split(' ');
        lines = ['', '', ''];
        currentLineIndex = 0;

        for (const word of words) {
            if (currentLineIndex >= 3) break;

            const testLine = lines[currentLineIndex] ? lines[currentLineIndex] + ' ' + word : word;
            if (testLine.length <= maxCharsPerLine) {
                lines[currentLineIndex] = testLine;
            } else {
                currentLineIndex++;
                if (currentLineIndex < 3) {
                    lines[currentLineIndex] = word;
                }
            }
        }

        // Update display
        lines.forEach((line, i) => {
            textElements[i].text(line);
        });

        // Update background
        const maxLineLength = Math.max(...lines.map(l => l.length));
        const textWidth = maxLineLength * 6.5;
        const lineCount = lines.filter(l => l.length > 0).length;
        const textHeight = lineCount * 16;

        bgRect
            .attr('x', -textWidth / 2 - 4)
            .attr('width', textWidth + 8)
            .attr('height', textHeight + 8)
            .attr('opacity', 0.9);

        // Small delay to make streaming visible (5ms feels responsive)
        await new Promise(resolve => setTimeout(resolve, 5));
    }

    // Truncate if needed
    if (lines[2] && lines[2].length > 37) {
        lines[2] = lines[2].substring(0, 37) + '...';
        textElements[2].text(lines[2]);
    }
}

// Stream text onto node using D3 (for simulated streaming - now only used for testing)
async function streamNodeText(nodeGroup, text) {
    const maxCharsPerLine = 40;

    // Add background rectangle
    const bgRect = nodeGroup.append('rect')
        .attr('class', 'thought-label-bg')
        .attr('y', 15)
        .attr('opacity', 0);

    // Add text elements
    const textElements = [];
    for (let i = 0; i < 3; i++) {
        const textEl = nodeGroup.append('text')
            .attr('y', 28 + (i * 16))
            .attr('text-anchor', 'middle')
            .attr('class', 'thought-text active')
            .text('');
        textElements.push(textEl);
    }

    // Stream words with visible animation
    const words = text.split(' ');
    let lines = ['', '', ''];
    let currentLineIndex = 0;

    for (const word of words) {
        if (currentLineIndex >= 3) break;

        const testLine = lines[currentLineIndex] ? lines[currentLineIndex] + ' ' + word : word;
        if (testLine.length <= maxCharsPerLine) {
            lines[currentLineIndex] = testLine;
        } else {
            currentLineIndex++;
            if (currentLineIndex < 3) {
                lines[currentLineIndex] = word;
            }
        }

        // Update display
        lines.forEach((line, i) => {
            textElements[i].text(line);
        });

        // Update background
        const maxLineLength = Math.max(...lines.map(l => l.length));
        const textWidth = maxLineLength * 6.5;
        const lineCount = lines.filter(l => l.length > 0).length;
        const textHeight = lineCount * 16;

        bgRect
            .attr('x', -textWidth / 2 - 4)
            .attr('width', textWidth + 8)
            .attr('height', textHeight + 8)
            .attr('opacity', 0.9);

        // Force browser to render the update
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                setTimeout(resolve, 30); // Faster streaming for better UX
            });
        });
    }

    // Truncate if needed
    if (lines[2] && lines[2].length > 37) {
        lines[2] = lines[2].substring(0, 37) + '...';
        textElements[2].text(lines[2]);
    }
}


function collapseThinkingTree() {
    const thinkingTree = document.getElementById('thinkingTree');

    // Don't collapse if in fullscreen mode
    if (thinkingTree.classList.contains('fullscreen')) {
        return;
    }

    setTimeout(() => {
        thinkingTree.classList.add('collapsed');
    }, 1500); // Collapse after 1.5 seconds
}

function toggleThinkingTree() {
    const thinkingTree = document.getElementById('thinkingTree');
    thinkingTree.classList.toggle('collapsed');
}

function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;

    const label = document.createElement('div');
    label.className = 'chat-message-label';
    label.textContent = role === 'user' ? 'You' : 'Philosophical Council';

    const text = document.createElement('div');
    text.textContent = content;

    messageDiv.appendChild(label);
    messageDiv.appendChild(text);
    chatContainer.appendChild(messageDiv);

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;

    return messageDiv;
}

async function sendMessage() {
    if (!demoEngine || !chatInput.value.trim()) return;

    const userMessage = chatInput.value.trim();
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Add user message
    addMessage('user', userMessage);
    conversationHistory.push({ role: "user", content: userMessage });

    // Add placeholder assistant message
    const assistantMessageDiv = addMessage('assistant', '');
    assistantMessageDiv.classList.add('streaming');
    const assistantTextDiv = assistantMessageDiv.querySelector('div:last-child');

    try {
        // Always use multi-philosopher tree-of-thought reasoning
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 NEW QUESTION:', userMessage);
        console.log(`👥 Engaging ${activePhilosophers.length} philosophers:`, activePhilosophers.map(p => p.name).join(', '));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Deep thinking with tree-of-thought (all philosophers)
        console.log('🌳 ACTIVATING MULTI-PERSPECTIVE REASONING');
        console.log('  Building philosophical council...');

        // Reset thought tree
        thoughtTree = {
            nodes: [],
            edges: [],
            nodeCount: 0
        };

        // Show tree visualization
        const thinkingTree = document.getElementById('thinkingTree');
        thinkingTree.classList.add('active');
        thinkingTree.classList.remove('collapsed');
        console.log('  Tree visualization activated');

        // Reset SVG and initialize D3
        d3.select('#treeSvg').selectAll('*').remove();
        setupD3Zoom();
        initializeTreeLayout();
        userHasInteracted = false; // Re-enable auto-centering for new tree

        // Create root node
        const rootId = thoughtTree.nodeCount++;
        const rootNode = {
            id: rootId,
            originalThought: userMessage,
            summary: null,
            isValid: true,
            showingSummary: false,
            depth: -1, // Root is at depth -1, children start at 0
            children: [],
            _children: null,
            active: false
        };
        thoughtTree.nodes.push(rootNode);
        thoughtTree.rootNode = rootNode;

        // Initialize hierarchy and layout
        rootHierarchy = d3.hierarchy(rootNode, d => d.children);
        rootHierarchy.x0 = 400;
        rootHierarchy.y0 = 0;
        treeLayout(rootHierarchy);
        updateTree(rootHierarchy);

        // PHASE 1: Build one branch per philosopher
        assistantTextDiv.textContent = `Channeling ${activePhilosophers.length} philosophical perspectives...`;
        console.log(`  🌳 Building ${activePhilosophers.length} philosophical branches...`);

        const philosophicalBranches = [];

        for (const philosopher of activePhilosophers) {
            console.log(`  📖 ${philosopher.name}: Starting exploration...`);

            // Build a tree branch for this philosopher
            const branch = await buildIntrospectiveTree(
                philosopher,
                userMessage,
                conversationHistory,
                rootNode,
                null,  // No parent thought
                [],    // Empty context path
                0,     // Starting depth
                2      // Reduced max depth since we have multiple branches
            );

            if (branch) {
                branch.philosopher = philosopher;
                philosophicalBranches.push(branch);
                console.log(`  ✅ ${philosopher.name}: Branch complete`);
            }
        }

        console.log('  📊 All philosophical branches complete');

        // PHASE 2: Bottom-up summarization for each branch
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 PHASE 2: BOTTOM-UP SUMMARIZATION');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        assistantTextDiv.textContent = 'Summarizing insights from each philosopher...';

        for (const branch of philosophicalBranches) {
            const philosopher = branch.philosopher;
            console.log(`  📝 ${philosopher.name}: Summarizing insights...`);
            await summarizeTreeBottomUp(philosopher, branch, userMessage, conversationHistory);
        }

        console.log('  ✅ All summaries complete');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Mark all nodes with summaries (they now have green glow)
        // No collapsing - tree stays expanded, summaries shown in tooltips
        console.log('  💡 Summaries available - click nodes with green glow to view');

        // PHASE 3: Synthesize all philosophical perspectives
        assistantTextDiv.textContent = 'Synthesizing collective wisdom...';
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📖 PHASE 3: MULTI-PERSPECTIVE SYNTHESIS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const conversationContext = conversationHistory.length > 0
            ? `\n\nOur conversation so far:\n${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Council'}: ${msg.content}`).join('\n')}\n\n`
            : '';

        // Gather all philosophical perspectives
        const perspectives = philosophicalBranches
            .filter(b => b.summary)
            .map(b => `${b.philosopher.name}'s perspective:\n${b.summary}`)
            .join('\n\n---\n\n');

        const synthesisPrompt = `${conversationContext}Question: "${userMessage}"

A philosophical council explored this question through ${philosophicalBranches.length} distinct perspectives:

${perspectives}

TASK: Synthesize these perspectives into a unified response that:
1. Honors the distinct insights from each philosopher
2. Reveals where they agree, conflict, or complement each other
3. Distills the collective wisdom into practical insight

Deliver a clear, thoughtful response (3-4 sentences) that integrates their wisdom.`;

        const completion = await demoEngine.chat.completions.create({
            messages: [
                { role: "system", content: `You are synthesizing insights from multiple philosophical perspectives. Integrate their wisdom respectfully and clearly.` },
                { role: "user", content: synthesisPrompt }
            ],
            temperature: 0.7,
            max_tokens: 200,
            repetition_penalty: 1.2,
            stream: true,
        });

        let fullText = '';
        assistantTextDiv.textContent = '';
        for await (const chunk of completion) {
            const token = chunk.choices[0]?.delta?.content || '';
            fullText += token;
            assistantTextDiv.textContent = fullText;
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        assistantMessageDiv.classList.remove('streaming');
        conversationHistory.push({ role: "assistant", content: fullText });

        console.log('✅ Multi-perspective synthesis complete');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Collapse tree after a delay (don't hide completely)
        collapseThinkingTree();

    } catch (error) {
        assistantTextDiv.textContent = 'Error: ' + error.message;
        assistantMessageDiv.classList.remove('streaming');
        collapseThinkingTree();
        console.error(error);
    }

    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !chatInput.disabled) {
        sendMessage();
    }
});

// No persona selection needed - all philosophers are always active

// Add toggle listener for thinking tree
document.getElementById('thinkingTreeHeader').addEventListener('click', toggleThinkingTree);

// Summary tooltip event listeners
document.getElementById('summaryTooltipClose').addEventListener('click', hideSummaryTooltip);

// Close tooltip when clicking outside
document.addEventListener('click', (event) => {
    const tooltip = document.getElementById('summaryTooltip');
    if (tooltip.classList.contains('visible') &&
        !tooltip.contains(event.target) &&
        !event.target.closest('.thought-node')) {
        hideSummaryTooltip();
    }
});

// Prevent tooltip from closing when clicking inside it
document.getElementById('summaryTooltip').addEventListener('click', (event) => {
    event.stopPropagation();
});

// Mermaid export functionality
function generateMermaidCode() {
    if (!thoughtTree.rootNode || thoughtTree.nodes.length <= 1) {
        return 'No tree available to export.';
    }

    let mermaidCode = 'graph TD\n';
    const nodeMap = new Map();

    // Sanitize text for Mermaid (remove quotes, newlines, special chars)
    function sanitize(text) {
        return text
            .replace(/"/g, "'")
            .replace(/\n/g, ' ')
            .replace(/\[/g, '(')
            .replace(/\]/g, ')')
            .substring(0, 50) + (text.length > 50 ? '...' : '');
    }

    // Generate node IDs
    thoughtTree.nodes.forEach(node => {
        nodeMap.set(node.id, `N${node.id}`);
    });

    // Generate node definitions
    thoughtTree.nodes.forEach(node => {
        const nodeId = nodeMap.get(node.id);
        let text = sanitize(node.originalThought);

        // Add philosopher name for root branches
        if (node.philosopher && node.depth === 0) {
            text = `[${node.philosopher.name}] ${text}`;
        }

        // Add summary indicator if node has a summary
        const hasSummary = node.summary && node.summary !== node.originalThought;
        const summaryTag = hasSummary ? ' ✓' : '';

        if (node.id === thoughtTree.rootNode.id) {
            // Root node - double circle
            mermaidCode += `    ${nodeId}(("${text}${summaryTag}"))\n`;
        } else if (node.children.length === 0) {
            // Leaf node - rounded rectangle
            mermaidCode += `    ${nodeId}("${text}${summaryTag}")\n`;
        } else {
            // Internal node - rectangle
            mermaidCode += `    ${nodeId}["${text}${summaryTag}"]\n`;
        }
    });

    mermaidCode += '\n';

    // Generate edges
    thoughtTree.edges.forEach(edge => {
        const sourceId = nodeMap.get(edge.source.id);
        const targetId = nodeMap.get(edge.target.id);

        // Add edge label if strategy exists
        if (edge.target.strategy) {
            mermaidCode += `    ${sourceId} -->|${edge.target.strategy.technique}| ${targetId}\n`;
        } else {
            mermaidCode += `    ${sourceId} --> ${targetId}\n`;
        }
    });

    // Add styling
    mermaidCode += '\n';
    mermaidCode += '    classDef rootNode fill:#666,stroke:#888,stroke-width:2px\n';
    mermaidCode += '    classDef leafNode fill:#1a1a1a,stroke:#00d9ff,stroke-width:2px\n';
    mermaidCode += '    classDef internalNode fill:#1a1a1a,stroke:#666,stroke-width:2px\n';
    mermaidCode += '    classDef hasSummary fill:#1a3a2a,stroke:#00ff88,stroke-width:3px\n';

    // Apply styles
    mermaidCode += `    class ${nodeMap.get(thoughtTree.rootNode.id)} rootNode\n`;

    thoughtTree.nodes.forEach(node => {
        if (node.id !== thoughtTree.rootNode.id) {
            const hasSummary = node.summary && node.summary !== node.originalThought;

            if (hasSummary) {
                // Nodes with summaries get special styling
                mermaidCode += `    class ${nodeMap.get(node.id)} hasSummary\n`;
            } else if (node.children.length === 0) {
                mermaidCode += `    class ${nodeMap.get(node.id)} leafNode\n`;
            } else {
                mermaidCode += `    class ${nodeMap.get(node.id)} internalNode\n`;
            }
        }
    });

    return mermaidCode;
}

function updateMermaidSidebar() {
    const mermaidCode = generateMermaidCode();
    document.getElementById('mermaidCode').textContent = mermaidCode;
}

function toggleMermaidSidebar() {
    const sidebar = document.getElementById('mermaidSidebar');
    sidebar.classList.toggle('open');

    if (sidebar.classList.contains('open')) {
        updateMermaidSidebar();
    }
}

// Fullscreen functionality
function toggleFullscreen() {
    const thinkingTree = document.getElementById('thinkingTree');
    thinkingTree.classList.toggle('fullscreen');

    const btn = document.getElementById('fullscreenBtn');
    if (thinkingTree.classList.contains('fullscreen')) {
        btn.textContent = '✕ Exit Fullscreen';
    } else {
        btn.textContent = '⛶ Fullscreen';
    }
}

// ESC key to exit fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const thinkingTree = document.getElementById('thinkingTree');
        if (thinkingTree.classList.contains('fullscreen')) {
            toggleFullscreen();
        }
    }
});

// Mermaid sidebar event listeners
document.getElementById('exportBtn').addEventListener('click', toggleMermaidSidebar);
document.getElementById('mermaidClose').addEventListener('click', toggleMermaidSidebar);
document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

document.getElementById('copyMermaidBtn').addEventListener('click', async () => {
    const code = document.getElementById('mermaidCode').textContent;

    try {
        await navigator.clipboard.writeText(code);
        const btn = document.getElementById('copyMermaidBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#00d9ff';
        btn.style.color = '#000';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    }
});

document.getElementById('downloadMermaidBtn').addEventListener('click', () => {
    const code = document.getElementById('mermaidCode').textContent;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `reasoning-tree-council-${timestamp}.md`;

    const philosopherNames = activePhilosophers.map(p => p.name).join(', ');
    const content = `# Multi-Perspective Reasoning Tree\n\n` +
                   `Philosophers: ${philosopherNames}\n\n` +
                   `Generated: ${new Date().toLocaleString()}\n\n` +
                   `\`\`\`mermaid\n${code}\n\`\`\`\n`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
});

// Initialize model on load
initDemoModel();
