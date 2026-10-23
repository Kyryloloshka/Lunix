import { Decimal } from '@shared/lib/decimal';
import type { SkillDefinition } from './types';

const D = Decimal.from;

export const SKILLS: SkillDefinition[] = [
  {
    id: 'html-css', name: 'CSS Flexbox & Grid', emoji: '', category: 'hard',
    description: 'Pixel-perfect centering without pain.',
    baseCost: D(15), costGrowth: 1.15, unlockRank: 0,
    capitalPerLevel: D(0.5), cognitivePerLevel: D(0), influencePerLevel: D(0),
    clickCapitalPerLevel: D(0), stressReductionPerLevel: 0,
  },
  {
    id: 'javascript', name: 'Async / Event Loop', emoji: '', category: 'hard',
    description: 'Mastering microtask queues & promises.',
    baseCost: D(80), costGrowth: 1.16, unlockRank: 0,
    prerequisites: [{ skillId: 'html-css', level: 3 }],
    capitalPerLevel: D(3), cognitivePerLevel: D(0.2), influencePerLevel: D(0.05),
    clickCapitalPerLevel: D(0), stressReductionPerLevel: 0,
  },
  {
    id: 'react', name: 'React Fiber & Hooks', emoji: '', category: 'hard',
    description: 'Reconciliation & state trees.',
    baseCost: D(600), costGrowth: 1.17, unlockRank: 1,
    prerequisites: [{ skillId: 'javascript', level: 3 }],
    capitalPerLevel: D(15), cognitivePerLevel: D(1), influencePerLevel: D(0.05),
    clickCapitalPerLevel: D(0), stressReductionPerLevel: 0,
  },
  {
    id: 'node', name: 'Node.js Streams', emoji: '', category: 'hard',
    description: 'Piping gigabytes without memory leaks.',
    baseCost: D(3500), costGrowth: 1.18, unlockRank: 2,
    prerequisites: [{ skillId: 'react', level: 3 }],
    capitalPerLevel: D(60), cognitivePerLevel: D(3), influencePerLevel: D(0.2),
    clickCapitalPerLevel: D(0), stressReductionPerLevel: 0,
  },
  {
    id: 'docker', name: 'Docker & Kubernetes', emoji: '', category: 'hard',
    description: 'Clusters, ingresses, and YAML infra.',
    baseCost: D(25000), costGrowth: 1.19, unlockRank: 3,
    prerequisites: [{ skillId: 'node', level: 3 }],
    capitalPerLevel: D(350), cognitivePerLevel: D(12), influencePerLevel: D(1),
    clickCapitalPerLevel: D(0), stressReductionPerLevel: 0,
  },
  {
    id: 'system-design', name: 'Distributed Systems', emoji: '', category: 'hard',
    description: '100K RPS, Sharding & Consistency.',
    baseCost: D(250000), costGrowth: 1.2, unlockRank: 4,
    prerequisites: [{ skillId: 'docker', level: 3 }],
    capitalPerLevel: D(2000), cognitivePerLevel: D(60), influencePerLevel: D(8),
    clickCapitalPerLevel: D(0), stressReductionPerLevel: 0,
  },
  {
    id: 'coffee', name: 'Aeropress & Cardamom', emoji: '', category: 'soft',
    description: 'Elevates focus & click throughput.',
    baseCost: D(25), costGrowth: 1.15, unlockRank: 0,
    capitalPerLevel: D(0), cognitivePerLevel: D(0), influencePerLevel: D(0),
    clickCapitalPerLevel: D(2), stressReductionPerLevel: 3,
  },
  {
    id: 'daily', name: 'Standup Sync', emoji: '', category: 'soft',
    description: 'Zero-blocker alignment meetings.',
    baseCost: D(180), costGrowth: 1.16, unlockRank: 1,
    prerequisites: [{ skillId: 'coffee', level: 3 }],
    capitalPerLevel: D(2), cognitivePerLevel: D(0), influencePerLevel: D(0.1),
    clickCapitalPerLevel: D(1), stressReductionPerLevel: 1,
  },
  {
    id: 'linkedin', name: 'Tech Blogging', emoji: '', category: 'soft',
    description: 'Publishing architecture post-mortems.',
    baseCost: D(800), costGrowth: 1.17, unlockRank: 1,
    prerequisites: [{ skillId: 'daily', level: 3 }],
    capitalPerLevel: D(0), cognitivePerLevel: D(0), influencePerLevel: D(1),
    clickCapitalPerLevel: D(0), stressReductionPerLevel: 0,
  },
  {
    id: 'delegate', name: 'Intern Delegation', emoji: '', category: 'soft',
    description: 'Automated background code generation.',
    baseCost: D(6000), costGrowth: 1.18, unlockRank: 2,
    prerequisites: [{ skillId: 'linkedin', level: 3 }],
    capitalPerLevel: D(35), cognitivePerLevel: D(1), influencePerLevel: D(0),
    clickCapitalPerLevel: D(0), stressReductionPerLevel: 2,
  },
];

export const skillById = (id: string): SkillDefinition | undefined => SKILLS.find((skill) => skill.id === id);
