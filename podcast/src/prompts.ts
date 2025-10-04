/**
 * Podcast prompt templates with multi-speaker dialogue
 */

import type { PodcastTemplate } from './types'

export const podcastTemplates: PodcastTemplate[] = [
  {
    name: 'Tech News Discussion',
    format: 'news-discussion',
    topic: 'Latest AI developments and their impact on software development',
    speakers: [
      { id: 'host1', name: 'Alex', role: 'host', provider: 'openai', voice: 'onyx', description: 'Tech podcast host, enthusiastic and curious' },
      { id: 'expert1', name: 'Dr. Sarah Chen', role: 'expert', provider: 'elevenlabs', voice: 'rachel', description: 'AI researcher, thoughtful and analytical' },
    ],
    dialogue: [
      { speaker: 'host1', text: "Welcome back to Tech Frontiers! I'm your host Alex, and today we're diving deep into the latest AI developments that are reshaping how we build software.", emotion: 'enthusiastic' },
      { speaker: 'host1', text: "Joining me is Dr. Sarah Chen, an AI researcher who's been at the forefront of these changes. Sarah, thanks for being here!", pause: 0.5 },
      { speaker: 'expert1', text: "Thanks for having me, Alex. It's an exciting time to be working in this field.", emotion: 'warm' },
      { speaker: 'host1', text: "Let's start with the elephant in the room - AI-powered code generation. How is this actually changing the day-to-day work of developers?" },
      { speaker: 'expert1', text: "Well, what we're seeing is a fundamental shift from writing code to orchestrating and reviewing code. Developers are becoming more like architects and quality assurance specialists.", pause: 0.3 },
      { speaker: 'expert1', text: "The AI handles the boilerplate, the repetitive patterns, even complex algorithms. But human judgment is still crucial for design decisions, edge cases, and ensuring the code aligns with business requirements." },
      { speaker: 'host1', text: "That's fascinating. So it's not replacing developers, it's augmenting their capabilities?" },
      { speaker: 'expert1', text: "Exactly. We're seeing productivity gains of 30 to 50 percent in some cases, but the role is evolving rather than disappearing.", emotion: 'confident' },
    ],
  },
  {
    name: 'Business Interview',
    format: 'interview',
    topic: 'Building a successful SaaS startup from scratch',
    speakers: [
      { id: 'host2', name: 'Jordan', role: 'host', provider: 'openai', voice: 'nova', description: 'Business podcast host, professional and insightful' },
      { id: 'guest1', name: 'Marcus Williams', role: 'guest', provider: 'google', voice: 'en-US-Neural2-D', description: 'SaaS founder, passionate and experienced' },
    ],
    dialogue: [
      { speaker: 'host2', text: "Today on Founder Stories, I'm thrilled to welcome Marcus Williams, founder and CEO of CloudMetrics, a SaaS platform that went from zero to 10 million ARR in just 18 months.", emotion: 'professional' },
      { speaker: 'guest1', text: "Thanks Jordan, great to be here.", emotion: 'humble' },
      { speaker: 'host2', text: "Marcus, let's go back to the beginning. What was the aha moment that led you to start CloudMetrics?" },
      { speaker: 'guest1', text: "It actually came from my own frustration as a product manager. I was drowning in data from a dozen different tools, spending hours each week just trying to compile basic reports for stakeholders.", pause: 0.4 },
      { speaker: 'guest1', text: "I thought, there has to be a better way. And that's when I started sketching out what would become CloudMetrics - a single dashboard that pulls everything together." },
      { speaker: 'host2', text: "And you built the first version yourself, right? Despite not being a developer by background?" },
      { speaker: 'guest1', text: "That's right. I spent six months learning to code, working nights and weekends while keeping my day job. The first version was rough, but it solved my problem, and I figured if it solved mine, it would solve others' too.", emotion: 'reflective' },
      { speaker: 'host2', text: "What was the hardest part of those early days?" },
      { speaker: 'guest1', text: "Honestly? Getting the first ten customers. Everyone wants to see that you have traction, but you can't get traction without customers. It's the classic chicken and egg problem.", emotion: 'candid' },
    ],
  },
  {
    name: 'Educational Deep Dive',
    format: 'deep-dive',
    topic: 'Understanding quantum computing for non-physicists',
    speakers: [
      { id: 'narrator1', name: 'Dr. Emma', role: 'narrator', provider: 'elevenlabs', voice: 'sarah', description: 'Science communicator, clear and engaging' },
      { id: 'expert2', name: 'Professor James', role: 'expert', provider: 'openai', voice: 'echo', description: 'Physics professor, patient and thorough' },
    ],
    dialogue: [
      { speaker: 'narrator1', text: "Quantum computing. It's a term we hear constantly in tech news, often surrounded by hype and mysticism. But what actually is it? How does it work? And why should you care?", emotion: 'engaging' },
      { speaker: 'narrator1', text: "To help us understand, I'm speaking with Professor James Morrison, who literally wrote the textbook on quantum computing for computer scientists.", pause: 0.5 },
      { speaker: 'expert2', text: "Thanks Emma. I'm excited to demystify this topic for your listeners.", emotion: 'friendly' },
      { speaker: 'narrator1', text: "Professor, let's start with the absolute basics. Classical computers use bits - zeros and ones. Quantum computers use qubits. What's the difference?" },
      { speaker: 'expert2', text: "Great question. A classical bit is like a light switch - it's either on or off, one or zero. A qubit can be both at the same time, in what we call a superposition.", pause: 0.3 },
      { speaker: 'expert2', text: "Imagine a coin spinning in the air - until it lands, it's both heads and tails simultaneously. That's superposition." },
      { speaker: 'narrator1', text: "So qubits can hold multiple states at once. How does that translate to computational power?" },
      { speaker: 'expert2', text: "Here's where it gets really interesting. With two classical bits, you can represent four states, but only one at a time: 00, 01, 10, or 11. With two qubits, you can represent all four states simultaneously.", pause: 0.4 },
      { speaker: 'expert2', text: "As you add more qubits, the number of possible states grows exponentially. Ten qubits can represent 1,024 states at once. Twenty qubits, over a million. Fifty qubits, more states than there are atoms in the planet.", emotion: 'excited' },
    ],
  },
  {
    name: 'Story Podcast',
    format: 'storytelling',
    topic: 'The last lighthouse keeper',
    speakers: [
      { id: 'narrator2', name: 'Morgan', role: 'narrator', provider: 'openai', voice: 'fable', description: 'Storytelling voice, atmospheric and evocative' },
      { id: 'character1', name: 'Old Tom', role: 'character', provider: 'google', voice: 'en-US-Neural2-J', description: 'Elderly lighthouse keeper, weathered and wise' },
    ],
    dialogue: [
      { speaker: 'narrator2', text: "The fog rolled in thick that November evening, as it always did. The beam from the lighthouse cut through it like a knife, sweeping across the dark Atlantic in its eternal rotation.", emotion: 'atmospheric', pause: 1.0 },
      { speaker: 'narrator2', text: "Inside the keeper's cottage, Old Tom sat by the fire, his weathered hands wrapped around a mug of tea. He was the last of them, the final lighthouse keeper on this stretch of coast." },
      { speaker: 'character1', text: "Forty-two years I've kept this light burning. Through storms that would make your blood run cold, through quiet nights where you could hear the stars breathe.", emotion: 'reflective', pause: 0.5 },
      { speaker: 'narrator2', text: "Tomorrow, they would come with their paperwork and their automated systems. They'd thank him for his service, hand him a plaque, and flip a switch that would make him obsolete." },
      { speaker: 'character1', text: "They say the new system is better. More reliable, they tell me. No human error.", pause: 0.4 },
      { speaker: 'character1', text: "But what they don't understand is... this light isn't just about keeping ships off the rocks. It's about bearing witness. About someone being here, keeping watch while others sleep.", emotion: 'solemn' },
      { speaker: 'narrator2', text: "He stood, his old bones creaking like the timbers of the lighthouse itself, and climbed the spiral staircase one more time. Tomorrow the light would still shine, but no one would be there to see it.", pause: 1.5 },
    ],
  },
  {
    name: 'Product Review Discussion',
    format: 'debate',
    topic: 'Are smart home devices worth the privacy trade-offs?',
    speakers: [
      { id: 'moderator', name: 'Casey', role: 'host', provider: 'openai', voice: 'shimmer', description: 'Podcast moderator, balanced and fair' },
      { id: 'pro', name: 'Tech Enthusiast', role: 'guest', provider: 'elevenlabs', voice: 'dave', description: 'Smart home advocate, optimistic' },
      { id: 'con', name: 'Privacy Advocate', role: 'guest', provider: 'google', voice: 'en-US-Neural2-C', description: 'Privacy expert, cautious' },
    ],
    dialogue: [
      { speaker: 'moderator', text: "Welcome to Tech Debate! Today we're tackling a question that's become increasingly relevant as our homes get smarter: Are these devices worth the potential privacy risks?", emotion: 'neutral' },
      { speaker: 'moderator', text: "On one side, we have Dave Chen, a smart home enthusiast who's been living in a fully automated home for three years. On the other, we have Lisa Martinez, a privacy advocate and cybersecurity expert.", pause: 0.5 },
      { speaker: 'pro', text: "Thanks for having me, Casey. I'm excited to talk about this because I think there's a lot of misunderstanding about what these devices actually do.", emotion: 'enthusiastic' },
      { speaker: 'con', text: "Thanks Casey. And Dave, I appreciate your enthusiasm, but I think we need to have an honest conversation about the risks involved.", emotion: 'serious' },
      { speaker: 'moderator', text: "Dave, let's start with you. Make your case - why are smart home devices worth it?" },
      { speaker: 'pro', text: "The convenience and energy savings alone are game-changing. My heating automatically adjusts based on the weather and whether I'm home. My lights turn off when rooms are empty. I'm saving 30% on my energy bills.", pause: 0.3 },
      { speaker: 'pro', text: "And then there's safety - I can see who's at my door from anywhere, check if I left the stove on, get alerts if there's a water leak. This isn't just convenience, it's peace of mind." },
      { speaker: 'con', text: "But at what cost, Dave? Those cameras at your door, those microphones in every room - they're constantly collecting data about your life. When you wake up, when you leave, what you watch, what you say.", pause: 0.4 },
      { speaker: 'con', text: "And that data doesn't stay in your home. It's being sent to corporate servers, often with unclear policies about who has access to it or how long it's kept.", emotion: 'concerned' },
      { speaker: 'pro', text: "That's a fair point, but modern devices give you control. You can turn off voice recording, delete your data, see exactly what's being collected-" },
      { speaker: 'con', text: "In theory, yes. But how many users actually go through those settings? And even if you do, you're trusting the company to honor your choices. We've seen too many data breaches and privacy violations to take that on faith.", emotion: 'skeptical' },
    ],
  },
]

export function getAllPodcastTemplates(): PodcastTemplate[] {
  return podcastTemplates
}

export function generateBatchPodcastPrompts(): PodcastTemplate[] {
  return podcastTemplates
}
