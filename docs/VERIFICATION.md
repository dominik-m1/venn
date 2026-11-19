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

## Aktualizacja: Stepper i draft w sesji karty

Po dodaniu kontrolowanej nawigacji oraz placeholderów kroków 2–5 ponownie sprawdzono:

- Jest na Node.js 26.13.1: **97 testów w 9 zestawach**, wszystkie przechodzą.
- ESLint z `--max-warnings=0`, TypeScript oraz `format:check`: bez błędów.
- `next build --webpack` na Node.js 26.13.1: poprawny build produkcyjny, kompilacja SCSS i prerenderowanie `/`.

Nowe testy obejmują granice kroków, blokowanie pominięcia niewysłanego profilu, nawigację placeholderów, fokus nagłówków, zachowanie edycji i postępu po remount, unieważnienie sukcesu po edycji oraz brak dodatkowego POST po powrocie do niezmienionego profilu. Sprawdzono też błędny JSON, nieobsługiwaną wersję draftu, nieprawidłowe typy pól, nieznany krok, zablokowane i pełne `sessionStorage`, Strict Mode oraz hydratację HTML serwera z innym zapisanym krokiem. Odpowiedzi sieciowe w tych testach zapewnia MSW; nie wysyłano nowych danych do API QA. Tę aktualizację zweryfikowano automatycznie, bez nowego przeglądu Chromium.

Domyślny Turbopack nie ukończył buildu w bieżącym środowisku: uruchomienie workera SCSS wymagało zbindowania lokalnego portu, co zwróciło `Operation not permitted`. Próba z eskalacją zwróciła ten sam błąd. Build Webpack przeszedł bez zmiany konfiguracji projektu. Domyślny Node.js w shellu to 22.23.4; testy uruchomione tym runtime kończyły się błędem zgodności Undici. Udane testy i build wykonano istniejącym lokalnie `/private/tmp/node-v26.13.1-darwin-arm64/bin/node`.

## Aktualizacja: audyt i porządkowanie kodu

Przed edycją przejrzano wszystkie moduły aplikacji, testy, style, konfiguracje oraz manifest i lockfile. Analiza importów przez TypeScript objęła 39 modułów źródłowych. Uwzględniono punkty wejścia App Router, konfigurację Jest, setup, polyfills, testy i importy Sass. Nie znaleziono osieroconych modułów ani cykli, również po uwzględnieniu importów typów. Własne źródła nie zawierają importów dynamicznych ani rejestru dependency injection.

Każda bezpośrednia zależność ma konsumenta w źródłach, konfiguracji, skryptach lub wymaganiach narzędzi. Zachowano między innymi `ts-node`, używane przez loader konfiguracji TypeScript w Jest, i `@testing-library/dom`, wymagane przez biblioteki testowe. Metadane zależności i plan implementacji pozostają dokumentacją historyczną, wskazaną w README. Nie usunięto plików ani paczek i nie zmieniono wersji zależności.

Wprowadzone zmiany:

- Zastąpiono `Object.fromEntries(...) as FormValues` jawnym przypisaniem sprawdzonych stringów do typowanych wartości draftu. Zachowano surowe dane, kolejność pól, wartości domyślne i pomijanie nieznanych kluczy.
- Dodano kontrolę `satisfies`, aby nazwy pól należały do typu wynikającego ze schematu Zod.
- Usunięto redundantny alias `ProfileDetailsRequest` oraz nieużywane eksporty wewnętrznych typów `ApiErrorKind` i `OnboardingStepId`. Same typy pozostają przy swoich konsumentach; publiczny interfejs feature jest bez zmian.
- Usunięto nieosiągalny fallback kroku po sukcesie: stała krotka zawsze zawiera krok 2.
- Zastąpiono dwie implementacje pomocnika deferred i ręczne przechwytywanie resolverów w teście strony przez `Promise.withResolvers`. Asercje testów pozostawiono bez zmian.
- Ujednolicono importy, dodano kontrolę ich kolejności, duplikatów i cykli oraz włączono `noUnusedLocals` i `noUnusedParameters`. Zachowano aliasy, granicę feature, konwencje komponentów i jeden istniejący zestaw reguł Prettiera.

Nie reorganizowano katalogów: istniejący podział modelu, HTTP, storage, hooków i UI ma wyraźne odpowiedzialności. Zachowano kontrolery anulowania i referencje statusów, ponieważ chronią kolejność zdarzeń przed kolejnym renderem. Podobne funkcje `isRecord` w HTTP i storage mają różne warunki akceptacji tablic; ich połączenie zmieniłoby zachowanie. Obsługa błędów storage oraz fallback komunikatu POST 400 pozostają celowe i udokumentowane.

| Kontrola                     | Wynik po zmianach                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`               | Bez błędów i ostrzeżeń, również z nowymi regułami importów.                                                         |
| `npm run format:check`       | Wszystkie obsługiwane pliki zgodne z jednym Prettierem.                                                             |
| `npm run typecheck`          | Generacja typów Next.js i TypeScript przechodzą.                                                                    |
| `npm run test:run`           | **135 testów w 9 zestawach**, wszystkie przechodzą przed i po zmianach.                                             |
| `npm run build -- --webpack` | Produkcyjny build, Sass, kontrola typów i prerenderowanie przechodzą przed i po zmianach.                           |
| `npm ls --all --offline`     | Exit 0; lokalna instalacja zawiera dwa nadmiarowe pakiety opcjonalne Sharp/WASM, bez zmian w manifeście i lockfile. |
| `git diff --check`           | Bez błędów whitespace.                                                                                              |

Polecenia uruchomiono na lokalnym Node.js 26.13.1. Zwykłe `npm run build` z Turbopackiem ponownie zatrzymało się na etapie kompilacji przed edycją i zostało przerwane. Końcowa próba z eskalacją zakończyła się błędem workera Sass: `binding to a port — Operation not permitted (os error 1)`. Udany build dotyczy Webpacka; domyślnego buildu Turbopack nie udało się potwierdzić w tym środowisku. Po tej próbie odtworzono poprawny build Webpack.

W osobnej kopii bazowego commitu zbudowano oryginalny kod tym samym Webpackiem. Produkcyjne strony bazową i po refaktoryzacji uruchomiono lokalnie i porównano w headless Brave/Chromium. Zrzuty całej strony są identyczne bajtowo dla obu viewportów: **1280 × 900** i **375 × 812**. Na małym ekranie `innerWidth` i `scrollWidth` wynoszą 375. Reguły wygenerowanego CSS, selektory, deklaracje i media queries są takie same; sortowanie importów zmieniło jedynie kolejność reguł poszczególnych komponentów. Prerenderowany HTML jest identyczny po pominięciu wygenerowanych skryptów i linków do assetów.

Rzeczywisty klik Submit pustego formularza pokazał cztery dotychczasowe komunikaty i przeniósł fokus na First Name. Żądania GET/POST, nawigację, hydratację, zapis draftu, błędy, timeouty, spóźnione odpowiedzi i blokadę podwójnego submitu potwierdzają istniejące testy z MSW. Nie wywoływano ponownie API QA ani nie wysyłano danych do backendu. Nie wykonano pełnej macierzy przeglądarek ani nowego testu live CORS.

Pozostawiono istniejący brak `favicon.ico`: zarówno wersja bazowa, jak i wynikowa zwracają 404, widoczne w konsoli przeglądarki. Nie zmieniano funkcjonalności ani zasobów UI w celu usunięcia tego ostrzeżenia. Historyczne zgłoszenia audytu zależności opisane wyżej nie zostały ponownie sprawdzone z rejestrem ani naprawione w ramach tego refaktoringu.
