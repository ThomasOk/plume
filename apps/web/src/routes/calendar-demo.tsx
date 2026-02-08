import { createFileRoute } from '@tanstack/react-router';
import { CalendarCell } from '../components/calendar/calendar-cell';
import { MonthCalendar } from '../components/calendar/month-calendar';
import type { CalendarDayCell } from '../components/calendar/types';
import { StatisticsView } from '@/features/memos/components/statistics-view';

export const Route = createFileRoute('/calendar-demo')({
  component: CalendarDemo,
});

function CalendarDemo() {
  const mockCells: CalendarDayCell[] = [
    {
      date: '2026-01-15',
      label: 15,
      count: 0,
      isCurrentMonth: true,
      isToday: false,
      isSelected: false,
      isWeekend: false,
    },
    {
      date: '2026-01-16',
      label: 16,
      count: 3,
      isCurrentMonth: true,
      isToday: false,
      isSelected: false,
      isWeekend: false,
    },
    {
      date: '2026-01-17',
      label: 17,
      count: 6,
      isCurrentMonth: true,
      isToday: true,
      isSelected: false,
      isWeekend: false,
    },
    {
      date: '2026-01-18',
      label: 18,
      count: 9,
      isCurrentMonth: true,
      isToday: false,
      isSelected: true,
      isWeekend: true,
    },
    {
      date: '2026-01-19',
      label: 19,
      count: 12,
      isCurrentMonth: true,
      isToday: false,
      isSelected: false,
      isWeekend: true,
    },
    {
      date: '2026-01-31',
      label: 31,
      count: 5,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      isWeekend: false,
    },
  ];

  const maxCount = 12;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">CalendarCell - Démo</h1>

        <div className="space-y-12">
          {/* Section 1 : Différentes intensités */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">
              Intensités de memos (0, 3, 6, 9, 12)
            </h2>
            <div className="grid grid-cols-5 gap-4">
              {mockCells.slice(0, 5).map((cell) => (
                <div key={cell.date} className="space-y-2">
                  <CalendarCell
                    cell={cell}
                    maxCount={maxCount}
                    onClick={(date) => console.log('Clicked:', date)}
                  />
                  <div className="text-center text-xs text-gray-600">
                    {cell.count} memo{cell.count > 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2 : États spéciaux */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">États spéciaux</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <CalendarCell
                  cell={mockCells[2]!} // isToday = true
                  maxCount={maxCount}
                />
                <div className="text-center text-xs text-gray-600">
                  Aujourd&apos;hui
                </div>
              </div>
              <div className="space-y-2">
                <CalendarCell
                  cell={mockCells[3]!} // isSelected = true
                  maxCount={maxCount}
                />
                <div className="text-center text-xs text-gray-600">
                  Sélectionné
                </div>
              </div>
              <div className="space-y-2">
                <CalendarCell
                  cell={mockCells[5]!} // isCurrentMonth = false
                  maxCount={maxCount}
                />
                <div className="text-center text-xs text-gray-600">
                  Autre mois
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 : Grille complète (simuler un calendrier) */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">
              Grille 7 colonnes (simulation calendrier)
            </h2>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 14 }).map((_, i) => {
                const cell: CalendarDayCell = {
                  date: `2026-01-${i + 1}`,
                  label: i + 1,
                  count: Math.floor(Math.random() * 13),
                  isCurrentMonth: true,
                  isToday: i === 6,
                  isSelected: i === 10,
                  isWeekend: i % 7 === 5 || i % 7 === 6,
                };
                return (
                  <CalendarCell
                    key={cell.date}
                    cell={cell}
                    maxCount={maxCount}
                    onClick={(date) => console.log('Clicked:', date)}
                  />
                );
              })}
            </div>
          </section>

          {/* Section 4 : MonthCalendar complet */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">
              MonthCalendar - Février 2026
            </h2>
            <div className="w-80">
              <MonthCalendar
                month="2026-02"
                data={{
                  '2026-02-02': 3,
                  '2026-02-04': 7,
                  '2026-02-05': 1,
                  '2026-02-10': 5,
                  '2026-02-12': 9,
                  '2026-02-14': 2,
                  '2026-02-18': 4,
                  '2026-02-20': 8,
                  '2026-02-25': 6,
                  '2026-02-28': 10,
                }}
                onClick={(date) => console.log('Clicked:', date)}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">
              StatisticsView - Intégration complète
            </h2>
            <div className="w-80">
              <StatisticsView />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Propriétés testées</h2>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
              <li>
                <strong>count</strong> : Nombre de memos (0-12) → opacité du
                fond bleu
              </li>
              <li>
                <strong>isToday</strong> : Bordure spéciale pour
                aujourd&apos;hui
              </li>
              <li>
                <strong>isSelected</strong> : Style de sélection
              </li>
              <li>
                <strong>isCurrentMonth</strong> : Griser les jours d&apos;autres
                mois
              </li>
              <li>
                <strong>isWeekend</strong> : Style différent pour
                samedi/dimanche
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
