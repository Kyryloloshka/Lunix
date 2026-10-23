import { Decimal } from '@shared/lib/decimal';

export interface CareerRank {
  id: number;
  title: string;
  subtitle: string;
  requiredCapital: Decimal;
  requiredInfluence: Decimal;
  emoji: string;
}

export const CAREER_RANKS: CareerRank[] = [
  { id: 0, title: 'Студент-самоучка', subtitle: 'Поки просто відкрив IDE', requiredCapital: Decimal.ZERO, requiredInfluence: Decimal.ZERO, emoji: '🎒' },
  { id: 1, title: 'Trainee', subtitle: 'Перший таск — змінити колір кнопки', requiredCapital: Decimal.from(100), requiredInfluence: Decimal.from(5), emoji: '🌱' },
  { id: 2, title: 'Junior Developer', subtitle: 'Перший pull request', requiredCapital: Decimal.from(5_000), requiredInfluence: Decimal.from(50), emoji: '💻' },
  { id: 3, title: 'Middle Developer', subtitle: 'Вже знаходиш власні баги', requiredCapital: Decimal.from(100_000), requiredInfluence: Decimal.from(500), emoji: '⚙️' },
  { id: 4, title: 'Senior Engineer', subtitle: 'Пише код годину, мітинги — весь день', requiredCapital: Decimal.from(2_000_000), requiredInfluence: Decimal.from(5_000), emoji: '🧠' },
  { id: 5, title: 'Team Lead', subtitle: 'Керуєш людьми, які керують тасками', requiredCapital: Decimal.from(50_000_000), requiredInfluence: Decimal.from(50_000), emoji: '🫡' },
  { id: 6, title: 'Principal Architect', subtitle: 'Малюєш квадратики за великі гроші', requiredCapital: Decimal.from(1e9), requiredInfluence: Decimal.from(500_000), emoji: '🏗️' },
  { id: 7, title: 'Unicorn CTO', subtitle: 'Залучаєш інвестиції замість зарплати', requiredCapital: Decimal.from(1e12), requiredInfluence: Decimal.from(5e6), emoji: '🦄' },
  { id: 8, title: 'Google CEO', subtitle: 'Вершина харчового ланцюга', requiredCapital: Decimal.from(1e15), requiredInfluence: Decimal.from(1e8), emoji: '👑' },
];
