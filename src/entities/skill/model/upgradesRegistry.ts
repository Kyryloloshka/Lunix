import { Decimal } from '@shared/lib/decimal';

export interface TechUpgrade {
  id: string;
  name: string;
  description: string;
  cost: Decimal;
  currency: 'capital' | 'cognitive' | 'influence';
  targetSkillId: string;
  multiplier: number;
  requiredSkillLevel: number;
}

export const TECH_UPGRADES: TechUpgrade[] = [
  {
    id: 'tailwind-macro',
    name: 'Tailwind JIT Engine',
    description: 'Triple Flexbox & Grid throughput (+200%)',
    cost: Decimal.from(250),
    currency: 'capital',
    targetSkillId: 'html-css',
    multiplier: 3,
    requiredSkillLevel: 5,
  },
  {
    id: 'v8-turbofan',
    name: 'V8 Turbofan JIT',
    description: 'Double Async/Event Loop output (+100%)',
    cost: Decimal.from(1_200),
    currency: 'capital',
    targetSkillId: 'javascript',
    multiplier: 2,
    requiredSkillLevel: 5,
  },
  {
    id: 'react-compiler',
    name: 'React 19 Forget Compiler',
    description: 'Auto memoize state trees, x3 React gain (+200%)',
    cost: Decimal.from(15_000),
    currency: 'capital',
    targetSkillId: 'react',
    multiplier: 3,
    requiredSkillLevel: 5,
  },
  {
    id: 'libuv-worker',
    name: 'Libuv Threadpool Tuning',
    description: 'x2.5 throughput on Node.js streams',
    cost: Decimal.from(100_000),
    currency: 'capital',
    targetSkillId: 'node',
    multiplier: 2.5,
    requiredSkillLevel: 5,
  },
  {
    id: 'k8s-operator',
    name: 'Kubernetes Custom Operator',
    description: 'Automate cluster deployments, x3 Docker efficiency',
    cost: Decimal.from(750_000),
    currency: 'capital',
    targetSkillId: 'docker',
    multiplier: 3,
    requiredSkillLevel: 5,
  },
];
