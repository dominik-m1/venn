# Onboarding Form

Formularz z `task.pdf`, zbudowany w Next.js App Router, React i TypeScript strict. Zawiera cztery wymagane pola, walidację po blur i submit oraz bezpośrednią integrację z API QA. Interfejs jest angielski, zgodnie z makietą.

## Uruchomienie

Wymagane: Node.js **26.13.1 LTS**, npm **11.20.0** (dołączony do tego Node.js).

```sh
nvm install
nvm use
npm ci
npm run dev
```

Otwórz [localhost:3000](http://localhost:3000). Aplikacja nie wymaga `.env`. Opcjonalny `NEXT_PUBLIC_API_BASE_URL` opisuje [.env.example](.env.example). Zmiana publicznej zmiennej wymaga ponownego buildu.

Wersja produkcyjna:

```sh
npm run build
npm run start
```

Inny port: `npm run start -- --port 3019`.

## Kontrole

```sh
npm ci
npm ls
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run start
```

`npm run format` formatuje pliki projektu za pomocą Prettiera. `npm run format:check` sprawdza formatowanie bez zapisywania zmian. Wspólne reguły w `.prettierrc.json` ustalają wcięcia po 2 spacje, pojedyncze cudzysłowy w TypeScript, średniki i docelową długość linii 80 znaków. `.prettierignore` wyklucza wygenerowane pliki i artefakty.

`npm test` uruchamia Jest, a `npm run test:watch` obserwuje zmiany. `typecheck` najpierw generuje typy Next.js, więc działa przed pierwszym buildem. ESLint działa niezależnie od buildu. Testy korzystają z `next/jest`, RTL, `user-event` i MSW 3. Nie wywołują API QA.

65 testów obejmuje granice walidacji, format i kraj telefonu, kontrakty HTTP, dostępność pól i cały formularz. Sprawdzają współdzielenie GET, kolejność GET/POST, nieaktualne odpowiedzi, podwójny submit, pusty sukces, awarie, timeouty i odmontowanie. Testy formularza renderują rzeczywiste atomy i molekuły, również w React Strict Mode.

MSW 3 używa importów `msw/http` i opcji `onUnhandledFrame: 'error'`. Konfiguracja Jest transformuje jego zależności ESM przez SWC. `polyfills.ts` dostarcza Web APIs, fetch z Undici oraz natywne timery Node. Testy timeoutów sterują wyłącznie terminem żądania aplikacji; nie zastępują zegara sieci MSW/Undici.

Jest zastępuje SCSS atrapami. Kompilację Sass potwierdza build, a wygląd, fokus, responsywność i CORS sprawdzono w Chromium. Szczegóły: [raport weryfikacji](docs/VERIFICATION.md).

## Architektura

| Warstwa                                    | Odpowiedzialność                                                    |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `src/app`                                  | Pages: serwerowa strona `/`, layout, język i style globalne.        |
| `components/templates`                     | Tło, krok, karta oraz miejsce na `children`.                        |
| `components/organisms`                     | Kliencki `OnboardingForm`, kompozycja pól i prezentacja stanów.     |
| `components/molecules`                     | `FormField`: etykieta, input, opis i powiązania ARIA.               |
| `components/atoms`                         | Natywne `Input`, `Label`, `FieldMessage` i `Button`.                |
| `features/onboarding/validation.ts`        | Czyste reguły lokalne i normalizacja payloadu.                      |
| `features/onboarding/useOnboardingForm.ts` | Jedyny właściciel stanu, walidacji i wysyłki.                       |
| `features/onboarding/onboarding.api.ts`    | Fetch, deadline, anulowanie, kontrola `unknown` i kategorie błędów. |
| `src/test`                                 | Środowisko testów i fixtures, niewłączane do aplikacji.             |

Każdy komponent w `atoms`, `molecules`, `organisms` i `templates` ma własny katalog nazwany w PascalCase. Implementacja, SCSS Module i istniejące testy znajdują się obok siebie, z nazwami plików w kebab-case:

```text
src/components/
  atoms/
    Input/
      index.ts
      input.tsx
      input.module.scss
  molecules/
    FormField/
      index.ts
      form-field.tsx
      form-field.module.scss
      form-field.test.tsx
```

Plik `index.ts` eksportuje komponent jako publiczny interfejs katalogu. Importy między komponentami używają aliasu `@/components`, np. `@/components/atoms/Input`; lokalne style i testy korzystają z importów względnych.

Atomy i molekuły nie znają reguł biznesowych ani API. Szablon otrzymuje formularz jako `children`. Strona i layout pozostają synchronicznymi Server Components. Granica `use client` znajduje się w organizmie.

Hook współdzieli wyłącznie trwające GET dla tego samego numeru i wersji. Edycja korporacji zwiększa wersję, anuluje żądanie i usuwa poprzedni wynik. Kontrola wersji chroni również przed spóźnioną odpowiedzią. Submit ponawia zakończoną walidację, czeka na wynik i blokuje edycję do zakończenia operacji. Referencja blokuje równoległy submit przed kolejnym renderem. Po sukcesie ponowna wysyłka wymaga edycji danych.

## Design system

Wszystkie wartości wizualne definiuje `src/styles/_variables.scss`: kolory, typografia, odstępy, promienie, wymiary, breakpoint i stany. `_mixins.scss` zawiera wspólny fokus, podstawę kontrolek i responsywność. `_index.scss` udostępnia je przez `@forward`; komponenty pobierają je przez `@use`.

SCSS Modules zawierają lokalny układ i selektory. Wartości strukturalne, np. `0`, `100%`, `auto`, `inherit` i definicje kolumn, pozostają lokalne. Nie ma równoległych tokenów TypeScript ani ręcznie utrzymywanej palety CSS variables. Reset ładuje się raz w `globals.scss`, importowanym wyłącznie przez layout. Font systemowy nie wymaga pobierania z sieci.

Zmianę tokenu sprawdzono w przeglądarce po pełnym buildzie: `$radius-control` zmieniony z `0.75rem` na `1.125rem` zmienił wszystkie inputy i przycisk z 12 na 18 px. Następnie przywrócono wartość docelową.

## Reguły i założenia produktu

- Zaimplementowano wyłącznie opisany ekran. `Step 1 of 5` pochodzi z makiety; kolejnych kroków PDF nie opisuje.
- Nazwy są wymagane i mają maksymalnie 50 jednostek UTF-16 po `trim()`. Dopuszczają diakrytykę, apostrofy, myślniki i wewnętrzne spacje. Nie zastosowano `maxLength`, aby nie obcinać danych i zachować limit po normalizacji.
- Telefon wymaga `+1` i dziesięciu cyfr ASCII, bez spacji i separatorów. `libphonenumber-js/max` musi potwierdzić poprawność oraz kraj `CA`; sam prefiks `+1` nie wystarcza. Numer o nieustalonym kraju jest odrzucany.
- Korporacja ma dokładnie dziewięć znaków. Brak lokalnego wymogu samych cyfr; o poprawności decyduje API. Zera wiodące są zachowane.
- Błędy pojawiają się po blur albo submit. Początkowy formularz jest pusty, bez błędów. Submit pozostaje dostępny, by użytkownik mógł wywołać walidację.
- HTTP 200 oznacza sukces POST bez parsowania body. Dane pozostają widoczne. Komunikat HTTP 400 jest renderowany jako tekst na poziomie formularza.
- Deadline wynosi 10 sekund, także podczas odczytu body. Brak potwierdzenia POST nie oznacza pewnego braku zapisu. Aplikacja nie ponawia POST automatycznie.
- Dane nie trafiają do logów, URL ani pamięci trwałej. Żądania mają `credentials: 'omit'`. Runtime nie importuje fixtures ani listy poprawnych korporacji.

## Integracja live

Sprawdzono **19 listopada 2026** z produkcyjnej aplikacji w Chromium, z originu `http://localhost:3019`:

| Operacja                       | Wynik                                                                  |
| ------------------------------ | ---------------------------------------------------------------------- |
| GET poprawnej korporacji z PDF | HTTP 200, `{corporationNumber, valid: true}`.                          |
| GET `000000000`                | HTTP **404**, `{valid: false, message: 'Invalid corporation number'}`. |
| Preflight POST                 | HTTP 204, dozwolony POST i nagłówek `content-type`.                    |
| POST danych testowych z PDF    | HTTP 200, tekst `OK`; formularz pokazał sukces.                        |
| CORS                           | `Access-Control-Allow-Origin: *`; GET i POST działają w przeglądarce.  |

**Odstępstwo od A12:** niepoprawna korporacja zwraca 404. Adapter uznaje ten status za wynik biznesowy wyłącznie przy poprawnym body `valid: false` z komunikatem. Inne błędy HTTP i niezgodne struktury oznaczają awarię integracji. Nie dodano proxy ani backendu.

Pusty sukces HTTP 200 i odpowiedzi POST 400 potwierdzają testy MSW. Live POST zwrócił `OK`; nie deklarujemy otrzymania pustego body od działającego serwera. CORS potwierdzono dla wskazanego originu, nie dla przyszłego hostingu.

## Wersje i kompatybilność

Wersje, `peerDependencies` i `engines` odczytano przez `npm view` **2026-11-19**. Sprawdzono, że `latest` nie wskazuje prerelease. Wszystkie bezpośrednie wersje są dokładne; `package-lock.json` utrwala całe drzewo. Rejestr odczytów: [dependencies.json](docs/dependencies.json), [compatibility.json](docs/compatibility.json).

| Pakiet                            | Zainstalowana wersja              |
| --------------------------------- | --------------------------------- |
| Next.js / eslint-config-next      | 16.4.6                            |
| React / React DOM                 | 19.3.1                            |
| TypeScript                        | **6.0.3**                         |
| Sass                              | 1.108.2                           |
| ESLint                            | **9.39.5**                        |
| Jest / jest-environment-jsdom     | 30.5.2                            |
| RTL / DOM / user-event / jest-dom | 16.3.3 / 10.4.2 / 14.6.13 / 8.0.0 |
| MSW                               | 3.0.7                             |
| libphonenumber-js                 | 1.13.17                           |
| @types/node                       | 26.6.6                            |
| @types/react / @types/react-dom   | 19.3.0                            |
| @types/jest / ts-node / Undici    | 30.0.0 / 10.9.2 / 8.12.4          |

Wyjątki wynikają z rzeczywistych peerDependencies, nie ze starszej konfiguracji:

1. `typescript@latest` to 7.0.2, ale najnowszy `typescript-eslint@8.73.0` obsługuje `<6.1.0`. Wybrano najnowszy zgodny TypeScript 6.0.3. Źródło: [oficjalna tabela zgodności](https://typescript-eslint.io/users/dependency-versions/) i odczyty npm.
2. `eslint@latest` to 10.15.0. Aktualne pluginy import, jsx-a11y i react używane przez Next.js deklarują zgodność najwyżej z ESLint 9. Wybrano najnowszy zgodny 9.39.5. Rejestr oznacza tę linię jako niewspieraną. Źródła: manifesty [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/package.json), [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import/blob/main/package.json), odczyty npm i `npm ls --all`.

Nie użyto `--force`, `--legacy-peer-deps`, overrides ani wyłączania kontroli jakości.

`npm audit` zgłasza 18 pozycji moderate w drzewie narzędzi Jest (glob/minimatch i pakiety zależne). Rejestr sugeruje downgrade Jest do 29, sprzeczny z wyborem najnowszego zgodnego wydania. Pozostawiono najnowszy Jest; nie stosowano wymuszonych aktualizacji pośrednich pakietów. Nie dotyczy to drzewa runtime. Szczegóły w raporcie weryfikacji.

## Przekazanie

Zgodnie z decyzją użytkownika przygotowano **repozytorium lokalne**. Nie publikowano go w serwisie Git ani nie wdrażano aplikacji. Dostęp recenzenta wymaga późniejszego opublikowania kodu przez użytkownika. Nie dodano funkcji P2, kolejnych kroków, CI, Dockera ani produkcyjnych mocków.

Podstawy konfiguracji: [Next.js: Jest](https://nextjs.org/docs/app/guides/testing/jest), [Next.js: Sass](https://nextjs.org/docs/app/guides/sass), [migracja MSW 3](https://mswjs.io/docs/migrations/2.x-to-3.x/), [Node.js LTS](https://nodejs.org/en/about/previous-releases).
