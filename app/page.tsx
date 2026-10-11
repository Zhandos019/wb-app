
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-lg font-bold text-white">
              W
            </div>
            <span className="text-xl font-bold tracking-tight">
              WB Analytics
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              Регистрация
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-100 opacity-70 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
              <span className="h-2 w-2 rounded-full bg-violet-600" />
              Аналитика продаж Wildberries
            </div>

            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Управляйте продажами
              <span className="text-violet-600"> на основе данных</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-gray-600">
              Анализируйте выручку, динамику продаж и финансовые показатели
              вашего магазина Wildberries в одном удобном кабинете.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="rounded-xl bg-violet-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-700"
              >
                Начать работу
                <span className="ml-2">→</span>
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-gray-200 bg-white px-7 py-3.5 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Войти в кабинет
              </Link>
            </div>

            <p className="mt-5 text-sm text-gray-500">
              Ваши отчёты и аналитика — в одном месте.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl shadow-violet-100 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Обзор продаж
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    Аналитика магазина
                  </h2>
                </div>
                <div className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">
                  WB
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Выручка</p>
                  <p className="mt-2 text-2xl font-bold">₸ —</p>
                  <p className="mt-1 text-xs text-gray-400">
                    По вашим отчётам
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Прибыль</p>
                  <p className="mt-2 text-2xl font-bold">₸ —</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Финансовые показатели
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Динамика продаж</p>
                  <span className="text-xs text-gray-400">
                    По месяцам
                  </span>
                </div>

                <div className="mt-6 flex h-32 items-end gap-3">
                  {[38, 54, 43, 68, 58, 82, 72, 100, 76, 90, 68, 94].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-md bg-violet-500 opacity-80 transition hover:opacity-100"
                        style={{ height: `${height}%` }}
                      />
                    )
                  )}
                </div>

                <div className="mt-3 flex justify-between text-xs text-gray-400">
                  <span>Янв</span>
                  <span>Мар</span>
                  <span>Июн</span>
                  <span>Сен</span>
                  <span>Дек</span>
                </div>
              </div>

              <p className="mt-4 text-center text-xs text-gray-400">
                Пример интерфейса • Данные не реальные
              </p>
            </div>

            <div className="absolute -bottom-5 -left-5 -z-10 h-32 w-32 rounded-2xl bg-violet-200/60 blur-xl" />
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50/70">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-600">
              Возможности платформы
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Всё важное для анализа продаж
            </h2>
            <p className="mt-4 leading-7 text-gray-600">
              Загружайте отчёты и отслеживайте ключевые показатели своего магазина.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-2xl">
                ↗
              </div>
              <h3 className="mt-5 text-lg font-bold">
                Динамика продаж
              </h3>
              <p className="mt-3 leading-7 text-gray-600">
                Сравнивайте результаты по месяцам и отслеживайте изменения выручки.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-2xl">
                ▤
              </div>
              <h3 className="mt-5 text-lg font-bold">
                Анализ отчётов
              </h3>
              <p className="mt-3 leading-7 text-gray-600">
                Загружайте Excel-отчёты Wildberries и изучайте показатели в удобном формате.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-2xl">
                ◷
              </div>
              <h3 className="mt-5 text-lg font-bold">
                История данных
              </h3>
              <p className="mt-3 leading-7 text-gray-600">
                Возвращайтесь к сохранённым отчётам и следите за результатами магазина.
              </p>
            </div>
          </div>

          <div className="mt-14 rounded-2xl bg-violet-600 px-6 py-10 text-center text-white sm:px-12 sm:py-14">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Готовы изучить свои продажи?
            </h2>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-violet-100">
              Создайте аккаунт и начните работать с аналитикой своего магазина.
            </p>
            <Link
              href="/register"
              className="mt-7 inline-flex rounded-xl bg-white px-7 py-3.5 font-semibold text-violet-700 transition hover:bg-violet-50"
            >
              Создать аккаунт →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-7 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} WB Analytics</span>
          <span>Инструмент аналитики для продавцов Wildberries</span>
        </div>
      </footer>
    </main>
  );
}
