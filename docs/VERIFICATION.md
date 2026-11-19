# Weryfikacja implementacji

Data: 2026-11-19. Środowisko: macOS arm64, Node.js 26.13.1 LTS, npm 11.20.0, Chromium 156.

## Kontrole automatyczne

| Kontrola                       | Wynik                                                        |
| ------------------------------ | ------------------------------------------------------------ |
| `npm ci`                       | Poprawna czysta instalacja z lockfile.                       |
| `npm ls` i `npm ls --all`      | Poprawne drzewo; brak invalid peerDependencies.              |
| `npm run lint`                 | Bez błędów i ostrzeżeń, `--max-warnings=0`.                  |
| `npm run typecheck`            | Poprawna generacja typów tras i TypeScript strict.           |
| `npm run test:run`             | 65 testów w 4 zestawach; wszystkie przechodzą.               |
| `npm run build`                | Produkcyjny build Turbopack; SCSS i kontrola typów działają. |
| `npm run start -- --port 3019` | Serwer produkcyjny uruchomiony i sprawdzony w Chromium.      |

Procedurę instalacji, drzewa zależności, lint, typów, testów i buildu powtórzono w czystej kopii `/private/tmp/venn-clean-7h8whd95`. Instalacja w tej kopii używała wyłącznie uprzednio pobranych paczek z cache npm (`--offline`). Wszystkie polecenia zakończyły się poprawnie.

Pierwszy build w ograniczonym sandboxie zatrzymał się bez dalszego wyjścia. Zakończono wyłącznie ten proces i ponowiono build poza sandboxem. Build przeszedł bez zmiany konfiguracji ani wyłączania kontroli.

## Przegląd w przeglądarce

- Porównano desktop 1280 × 900 z makietą na stronie 4 PDF.
- Sprawdzono rzeczywisty viewport 375 × 812; `innerWidth` i `scrollWidth` wynosiły 375.
- Potwierdzono jedną kolumnę nazw na małym ekranie.
- Sprawdzono Tab i fokus: obramowanie `solid`, szerokość 3 px.
- Sprawdzono angielskie etykiety, wymagane pola i opisy błędów w drzewie dostępności.
- Odrzucono numer USA `+12025550123` po blur.
- Sprawdzono rzeczywisty GET z wynikiem 404/invalid i 200/valid.
- Wywołano Submit klawiszem Enter; po POST pojawił się sukces i blokada kolejnej wysyłki.
- Potwierdzono preflight 204 oraz CORS dla originu `http://localhost:3019`.
- Zasymulowano tryb Offline: komunikat wskazywał brak weryfikacji, pola pozostały dostępne.
- Sprawdzono stan oczekiwania na GET i możliwość ponownej weryfikacji.
- Zmieniono tymczasowo token `$radius-control`, zbudowano aplikację i uruchomiono ją na porcie 3020. Wszystkie cztery inputy i przycisk otrzymały 18 px zamiast 12 px. Przywrócono token.
- Przejrzano źródła: brak kopii kolorów i wymiarów poza variables, brak runtime fixtures, logów i trwałego zapisywania danych.

Testy współbieżności używają sterowanych obietnic i sprawdzają liczbę żądań. Testy timeoutów sterują tylko terminem aplikacji. Brak arbitralnego oczekiwania i zależności testów od QA.

## Zależności

`latest` sprawdzono dla wszystkich bezpośrednich zależności, generatora i dodatkowego Undici przed instalacją. `npm view` zapisał wersję, peerDependencies i engines. Node LTS wybrano z oficjalnego indeksu wydań Node.js. Wyjątki ESLint i TypeScript opisuje README.

Audyt zgłosił 18 pozycji moderate w narzędziach deweloperskich. Źródłowe zgłoszenia dotyczą:

- [glob: anulowanie przez AbortSignal](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), zakres 9.0.0–14.0.1;
- [minimatch: amplifikacja globparts](https://github.com/advisories/GHSA-g3hv-75wg-m249), zakres 7.0.0–11.0.0.

Pozostałe pozycje to pakiety zależne w drzewie Jest. Nie zmieniano ich niezgodnie z deklarowanymi zakresami. Rejestr proponuje Jest 29 jako automatyczną naprawę. Nie wykonano `npm audit fix --force`.

`npm audit --omit=dev` potwierdził **0 podatności** w zależnościach runtime.

## Granice potwierdzenia

Sprawdzono Chromium, bez pełnej macierzy przeglądarek ani formalnego audytu WCAG. PDF nie wymaga tych rozszerzeń. Live sukces POST zawierał tekst `OK`; pusty sukces i POST 400 sprawdzono z MSW. CORS przyszłego hostingu wymaga osobnego sprawdzenia. Publikację repozytorium pozostawiono użytkownikowi zgodnie z jego decyzją.
