# 📝 ETAP 4: Reset hasła — jednorazowy token, hash w bazie i link w mailu


## Jaki jest cel tego etapu?

W poprzednim etapie nauczyłeś aplikację jednej rzeczy: jeśli ktoś zna swoje hasło, to się zaloguje i dostanie token. Ale co zrobić, gdy użytkownik **zapomniał** hasła? Nie ma jak się zalogować, więc nie ma jak wejść w ustawienia, żeby je zmienić. Potrzebny jest mechanizm „wyjścia awaryjnego": użytkownik podaje swój e-mail, my wysyłamy mu na skrzynkę specjalny link, a ten link pozwala ustawić nowe hasło.

I tu jest cała trudność tego etapu: **ten link musi być bezpieczny**. Ktoś, kto go przechwyci, nie może zmienić hasła. Ktoś, kto ukradnie bazę danych, też nie może. A sam link musi przestać działać po użyciu i po 30 minutach.

Dobra wiadomość: **model w bazie już masz** — `PasswordResetToken` powstał w Etapie 2 (razem z `onDelete: Cascade`, o które prosił mentor). Dziś dokładasz brakującą logikę: dwa endpointy na backendzie i dwie strony na froncie.

Plan przepływu, który zaraz zbudujesz:

```
1. Użytkownik wpisuje e-mail na stronie /forgot-password
2. Frontend → POST /api/auth/forgot-password { email }
3. Backend:
     a. kasuje WSZYSTKIE stare tokeny tego użytkownika
     b. generuje losowy token (64 znaki)
     c. do bazy zapisuje tylko HASH tokenu + datę ważności (+30 minut)
     d. [TODO: wysłać maila] link: /reset-password?token=<TEN TOKEN>
4. Użytkownik klika link z maila → strona /reset-password?token=XYZ
5. Frontend → POST /api/auth/reset-password { token, password }
6. Backend:
     a. hashuje token z requestu i szuka go w bazie
     b. sprawdza, czy nie wygasł
     c. zapisuje nowe hasło (bcrypt) i KASUJE wszystkie tokeny użytkownika
7. Użytkownik loguje się nowym hasłem
```

### ⚠️ Zanim zaczniesz — co musi już działać

- [ ] Etap 3 domknięty: logujesz się z UI, token jest zapisywany, `/api/auth/me` zwraca Twój e-mail
- [ ] `docker compose up -d` działa, backend i frontend wystartowane (`npm run dev` w obu)
- [ ] W `npm run db:studio` (z `backend/`) widzisz tabele `User` **i** `PasswordResetToken` — jeśli nie, zrób `npx prisma migrate dev`

**Numeracja:** to jest Etap 4 w Twoim planie (Etap 3 = logowanie + JWT, który właśnie domykasz).


---

# KROK 1: Stworzenie narzędzi do generowania i hashowania tokenu


## Co robisz:

Tworzysz zupełnie nowy, niezależny plik **`backend/src/utils/token.ts`**. Leży obok `utils/password.ts` i `utils/jwt.ts` — czyli w folderze, w którym trzymamy małe, czyste funkcje pomocnicze (bez Expressa, bez bazy).

## Kod, który wpisujesz:

```ts
import { createHash, randomBytes } from 'node:crypto';

// 1. Generuje losowy token, który poleci linkiem do użytkownika.
//    32 bajty = 64 znaki hex = 256 bitów losowości. Nie da się tego zgadnąć.
export function generateResetToken(): string {
    return randomBytes(32).toString('hex');
}

// 2. Tworzy NIEODWRACALNY hash tokenu — właśnie TO trafia do bazy danych.
export function hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}
```

Używaj kodu z rozwagą.

## 🧐 Czemu to robimy i po co to wykorzystamy?

• **Dlaczego w ogóle osobny mechanizm tokenu, a nie JWT?** Mentor napisał to wprost: *„w emailu wysyła się link zawierający token, to nie używaj do tego czasem jwt, tylko normalny token"*. Powód jest techniczny: **JWT jest bezstanowy** — to znaczy, że backend nie trzyma żadnej listy wydanych tokenów. Podpisany raz token jest ważny aż do wygaśnięcia i **nie da się go unieważnić**. A my potrzebujemy tokenu, który:
  1. zadziała **tylko raz** (po użyciu ma być martwy),
  2. da się **skasować**, gdy użytkownik poprosi o nowy link,
  3. ma twardą datę ważności zapisaną w bazie.

  Żadnej z tych rzeczy nie da się zrobić z samym JWT podpisanym kluczem — bez rekordu w bazie nie ma czego kasować. **Dlatego token resetu MUSI być rekordem w bazie.** Twoja tabela `PasswordResetToken` jest dokładnie tym rekordem.

• **Dlaczego do bazy idzie hash, a nie sam token?** To ten sam powód, dla którego hasła zapisujesz jako hash (bcrypt): **gdyby baza wyciekła, atakujący nie może nic zrobić z tym, co w niej znajdzie**. Gdyby w kolumnie `token` leżał gotowy token, każdy, kto zrobiłby dump bazy, mógłby wejść na `/reset-password?token=...` i przejąć dowolne konto. Z hashem — nie ma jak odtworzyć oryginału. Mentor napisał: *„zadbaj żeby to był hash nie token"* — to jest ten krok.

• **Dlaczego SHA-256, a nie bcrypt?** Tu jest subtelność, którą warto zrozumieć, bo brzmi jak sprzeczność z tym, co robisz z hasłami. bcrypt jest **celowo wolny** i przy każdym hashowaniu używa **innej soli** (dlatego tego samego hasła nigdy nie da się porównać dwa razy tak samo). A nam zależy na czymś zupełnie odwrotnym: przy logowaniu w `utils/password.ts` porównujesz hasło przez `bcrypt.compare`, ale tutaj musimy **wyszukać rekord po hashu** — czyli potrzebujemy, żeby ten sam token dawał zawsze ten sam hash (funkcja deterministyczna). Do tego:
  - nasz token ma **256 bitów losowości**, więc nie da się go zgadnąć metodą brute-force — szybkość hasha nie ma znaczenia,
  - przy hasłach siła bcryptu jest potrzebna, bo ludzie wymyślają hasła słownikowe,

  Zasada kciuka: **wolny hash do sekretów wymyślonych przez człowieka (hasła), szybki hash do wartości losowych (tokeny).**

• **Po co nam te funkcje później?** Obie będą używane w **obu** endpointach tego etapu:
  - `generateResetToken()` → tylko w `forgotPassword` (tam token powstaje),
  - `hashResetToken()` → w `forgotPassword` (żeby zapisać do bazy) **i** w `resetPassword` (żeby zamienić token z linku na hash i go wyszukać).

  Gdybyśmy tego nie wydzielili, tę samą logikę hashowania trzepalibyśmy w dwóch kontrolerach — a to prosta droga do tego, że w jednym miejscu poprawisz, w drugim zapomnisz.

• **`node:crypto`** to wbudowany moduł Node.js — **nie wymaga żadnego `npm install`**. `randomBytes` to kryptograficznie bezpieczny generator losowości (nie „matematyczny" `Math.random`, którego wyniki da się przewidzieć!). To ważne: `Math.random()` do generowania tokenów to klasyczny błąd początkujących.


---

# KROK 2: Dodanie schematów walidacji


## Co robisz:

Dopisujesz na dole pliku **`backend/src/modules/auth/auth.schemas.ts`** dwa nowe schematy zod — obok tych, które już tam masz (`registerSchema`, `loginSchema`).

## Kod, który wpisujesz:

```ts
export const forgotPasswordSchema = z.object({
    email: z.email('Enter a valid email address.'),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
```

Używaj kodu z rozwagą.

## 🧐 Czemu to robimy i po co to wykorzystamy?

• **„Validate at the boundary"** — walidujemy na granicy systemu. Dane, które przychodzą z zewnątrz, to jedyne miejsce, któremu nie wolno ufać. Kontrolery mają dalej zakładać, że dane są poprawne — nie muszą sprawdzać „a co jeśli przyjdzie pusty string".

• **Dlaczego `password` ma tutaj `min(8)`, a w `loginSchema` było `min(1)`?** Bo są to dwa różne zadania. W logowaniu tylko weryfikujesz, że użytkownik coś wpisał (nie oceniasz jakości hasła). Tutaj **ustalasz nowe hasło**, więc egzekwujesz regułę rejestracji: minimum 8 znaków. Spójność z `registerSchema` jest celowa — nowe hasło musi spełniać te same wymagania co hasło przy rejestracji.

• **Po co walidować `token`?** Bo on przychodzi z URL-a (`?token=...`), a URL to dane od użytkownika jak każde inne. Ktoś może wysłać pusty token albo `undefined`. Zamiast wywalać się w bazie (błąd Prisma), odbijamy request z kodem `422` już na wejściu.

• **Typy `ForgotPasswordInput` i `ResetPasswordInput`** — to kontynuacja wzoru z `RegisterInput`/`LoginInput`. TypeScript wygeneruje je ze schematu, więc nie ma szans, że rozejdą się z regułami walidacji. Nawet jeśli ich teraz nie użyjesz, warto utrzymać konwencję w pliku — za chwilę mogą się przydać.


---

# KROK 3: Endpoint „poproszę nowy link" (`forgotPassword`)


## Co robisz:

Dopisujesz nowy kontroler **na dole** pliku `backend/src/modules/auth/auth.controller.ts`. Najpierw jednak dokładasz importy i jedną stałą na samej górze pliku.

## 🛠️ Fragment A: Importy i stała z czasem ważności

**Kod, który wpisujesz (na samej górze pliku, dopisując do istniejących importów):**

```ts
import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from './auth.schemas.js';
import { env } from '../../config/env.js';
import { generateResetToken, hashResetToken } from '../../utils/token.js';

// Czas życia tokenu resetu hasła — dokładnie 30 minut, jak chciał mentor.
const RESET_TOKEN_TTL_MINUTES = 30;
```

Używaj kodu z rozwagą.

**🧐 Czemu to robimy:**

• **`env`** — potrzebujemy `FRONTEND_URL` z pliku `.env`, żeby zbudować link do strony z resetem (`http://localhost:5173/reset-password?token=...`). Używamy walidowanego `env`, a nie `process.env` — dzięki temu mamy pewność, że zmienna istnieje i jest poprawnym URL-em (zadbał o to zod w `config/env.ts`).

• **Stała `RESET_TOKEN_TTL_MINUTES`** zamiast wklejania `30 * 60 * 1000` w środku kodu. Trzy korzyści:
  1. widać intencję (nazwa mówi, co to jest),
  2. łatwo zmienić (do testów możesz tymczasowo ustawić `1` i sprawdzić, czy token wygasa),
  3. nie ma magii liczb w kodzie („czemu tu jest 1800000?").

  I najważniejsze: mentor napisał wprost *„Token ma mieć czas ważności np 30 min"* — mając to jako nazwaną stałą, wymaganie jest widoczne w kodzie i w code review.

## 🛠️ Fragment B: Kontroler `forgotPassword`

**Kod, który wpisujesz (na dole pliku `auth.controller.ts`):**

```ts
export async function forgotPassword(req: Request, res: Response): Promise<void> {
    const result = forgotPasswordSchema.safeParse(req.body);

    if (!result.success) {
        res.status(422).json({ message: result.error.issues[0]?.message ?? 'Invalid input.' });
        return;
    }

    const email = result.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // UWAGA: celowo NIE ma tu else / early return dla braku użytkownika.
    // Obsługujemy oba przypadki (jest user / nie ma usera) tą samą odpowiedzią.
    if (user) {
        // 1. Kasujemy WSZYSTKIE stare tokeny tego użytkownika.
        //    Dzięki temu zawsze aktywny jest tylko najnowszy link.
        await prisma.passwordResetToken.deleteMany({
            where: { userId: user.id },
        });

        // 2. Surowy token poleci do maila, HASH trafia do bazy.
        const token = generateResetToken();

        await prisma.passwordResetToken.create({
            data: {
                tokenHash: hashResetToken(token),
                expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
                userId: user.id,
            },
        });

        // 3. Budujemy link, który użytkownik dostanie mailem.
        const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;

        // TODO: zrobić wysyłanie maila z linkiem `resetLink`.
        // Na razie wypisujemy go w konsoli serwera, żeby dało się przetestować
        // cały przepływ bez skrzynki pocztowej.
        console.log(`[DEV] Link do resetu hasła dla ${email}: ${resetLink}`);
    }

    // 4. ZAWSZE zwracamy to samo — nawet gdy konto nie istnieje.
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
}
```

Używaj kodu z rozwagą.

## 🧐 Czemu to robimy i po co to wykorzystamy?

• **Kasowanie starych tokenów PRZED utworzeniem nowego** — to jest dosłowne wymaganie mentora: *„albo jak ktoś uderzy w endpoint resetu hasła, sprawdź najpierw czy są jakieś tokeny dla tego usera w bazie danych i je skasuj"*. `deleteMany` zamiast `delete` jest tu kluczowe, bo kasuje **wszystkie** rekordy tego użytkownika (po wielu kliknięciach „wyślij link" może być ich kilka). Efekt biznesowy: w każdej chwili istnieje **dokładnie jeden ważny link** — jeśli użytkownik kliknie „wyślij jeszcze raz", poprzedni link natychmiast umiera. Bez tego miałbyś w obiegu 10 żywych linków, a każdy z nich to kolejna szansa dla atakującego.

• **`token` do maila, `tokenHash` do bazy** — zwróć uwagę, jak `generateResetToken()` i `hashResetToken()` współpracują: funkcja generuje losowy token, `create` zapisuje **tylko** jego hash, a surowy token istnieje **tylko przez ułamek sekundy** w pamięci — akurat tyle, żeby włożyć go do linku. Po restarcie serwera ten token nie istnieje już w żadnym pliku ani w bazie (oprócz nieodwracalnego hasha). Dokładnie tak ma być.

• **`new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000)`** — liczymy datę wygaśnięcia „teraz + 30 minut". `Date.now()` zwraca milisekundy, więc `30 * 60 * 1000` = 30 minut w milisekundach. Ta data leci do kolumny `expiresAt` — i później `resetPassword` nie musi niczego pamiętać, wystarczy porównać z „teraz".

• **Link budujemy z `env.FRONTEND_URL`, a nie na sztywno** — bo w dev to `http://localhost:5173`, a na produkcji zupełnie inna domena. Backend nie musi wiedzieć, gdzie stoi frontend — pyta `.env`. (To zresztą zły powód, dla którego `FRONTEND_URL` znalazło się w `.env.example` już w Etapie 1: obsługuje dwie rzeczy — CORS i linki w mailach.)

• **`TODO: zrobić wysyłanie maila`** — tak wprost napisał mentor: *„Nie musisz robić wysyłania maila, możesz dać »todo: zrobić wysyłanie maila«, ale endpointy przygotuj"*. Dlatego zamiast integracji z pocztą robimy `console.log`. Zwróć uwagę na przedrostek `[DEV]` — gdy podłączysz prawdziwą wysyłkę (nodemailer / Resend / Mailtrap), ten log trzeba **usunąć albo ogrodzić** warunkiem `if (process.env.NODE_ENV !== 'production')`. Wypisywanie działającego linku do resetu hasła w logach produkcyjnych to luka bezpieczeństwa — każdy, kto ma dostęp do logów serwera, może przejąć dowolne konto.

• **TAJEMNICA TEGO KROKU: dlaczego nie ma `else` i dlaczego zawsze zwracamy `200` z tym samym komunikatem?** Wyobraź sobie, że odpowiadasz „nie ma takiego konta" (`404`). Wtedy każdy może wpisywać kolejne adresy i **sprawdzać, kto ma u Ciebie konto** — a to pierwszy krok do ataku (np. phishingu „potwierdź hasło, bo ktoś próbował je zresetować"). To się nazywa **user enumeration** i dokładnie ten sam mechanizm zastosowałeś już w `login` (ten sam komunikat dla złego maila i złego hasła). Tutaj idziemy o krok dalej: odpowiedź jest identyczna także co do treści i statusu. Zasada: **endpoint resetu hasła nie może zdradzić, czy dany e-mail istnieje w bazie.**


---

# KROK 4: Endpoint „ustaw nowe hasło" (`resetPassword`)


## Co robisz:

Dopisujesz drugi kontroler na dole pliku **`backend/src/modules/auth/auth.controller.ts`** (pod `forgotPassword`).

## Kod, który wpisujesz:

```ts
export async function resetPassword(req: Request, res: Response): Promise<void> {
    const result = resetPasswordSchema.safeParse(req.body);

    if (!result.success) {
        res.status(422).json({ message: result.error.issues[0]?.message ?? 'Invalid input.' });
        return;
    }

    // 1. Zamieniamy token z linku na hash i szukamy rekordu w bazie.
    //    Wyszukujemy PO HASZU — surowego tokenu w bazie po prostu nie ma.
    const tokenHash = hashResetToken(result.data.token);
    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
    });

    // 2. Awaryjne wyjście: token nie istnieje albo wygasł.
    if (!resetToken || resetToken.expiresAt < new Date()) {
        if (resetToken) {
            // Sprzątamy przeterminowany rekord, żeby baza nie puchła.
            await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
        }

        res.status(400).json({ message: 'This reset link is invalid or has expired.' });
        return;
    }

    // 3. Hashujemy nowe hasło — tak samo jak przy rejestracji.
    const passwordHash = await hashPassword(result.data.password);

    // 4. Transakcja: zmiana hasła i skasowanie tokenów muszą się udać RAZEM.
    await prisma.$transaction([
        prisma.user.update({
            where: { id: resetToken.userId },
            data: { password: passwordHash },
        }),
        prisma.passwordResetToken.deleteMany({
            where: { userId: resetToken.userId },
        }),
    ]);

    res.json({ message: 'Password has been reset. You can log in now.' });
}
```

Używaj kodu z rozwagą.

## 🧐 Czemu to robimy i po co to wykorzystamy?

• **`hashResetToken(result.data.token)` + `findUnique({ where: { tokenHash } })`** — to jest serce całego mechanizmu i miejsce, w którym widać, dlaczego wybraliśmy SHA-256 zamiast bcrypt. Token z URL-a zamieniamy na hash i **wyszukujemy po tej kolumnie**. Gdybyśmy używali bcrypta, nie dałoby się tego zrobić jednym zapytaniem — musielibyśmy wyciągać z bazy wszystkie tokeny i porównywać je po kolei, co jest i wolne, i głupie. Dodatkowo kolumna ma `@unique`, więc baza utrzymuje indeks i wyszukiwanie jest błyskawiczne.

• **`findUnique` zwraca `null`, gdy nie ma rekordu** — i to jest obsłużone w jednym `if`. Trzy scenariusze lądują w tym samym miejscu:
  1. token nie istnieje (ktoś wpisał śmieci),
  2. token został już użyty (skasowany w kroku 4 poniżej),
  3. token wygasł (`expiresAt < new Date()`).

  Wszystkie trzy dostają ten sam, bezpieczny komunikat `400`. Nie mówimy „token był już użyty" ani „token wygasł" — nie ma po co dawać atakującemu dodatkowych informacji.

• **„Kasowanie tokenów po wykorzystaniu"** — to kolejny punkt z maila mentora: *„pamiętaj o kasowaniu tokenów np po wykorzystaniu"*. Robi to `deleteMany` w transakcji. Skutek: link działa dokładnie **raz**. Ktoś, kto podejrzy link w historii przeglądarki albo w mailu, nie zrobi z nim już nic.

• **Po co `delete` przeterminowanego tokenu?** Sprzątanie. Bez tego przy każdym wygaśniętym linku w bazie zostawałby śmieciowy rekord na zawsze. To drobiazg, ale pokazuje, że myślisz o bazie jak o czymś, co trzeba utrzymywać, a nie tylko „wsypywać dane".

• **`prisma.$transaction([...])`** — dlaczego nie zrobić tego w dwóch osobnych zapytaniach? Bo gdyby serwer padł (albo wystąpił błąd połączenia) **pomiędzy** zmianą hasła a skasowaniem tokenu, mielibyśmy niespójny stan: hasło zmienione, ale token nadal żywy. Wtedy ten sam link mógłby zostać użyty drugi raz. Transakcja to gwarancja „wszystko albo nic" — albo oba zapisy się udadzą, albo żaden.

• **`hashPassword(...)` — funkcja z `utils/password.ts`, używana też przy rejestracji.** Nowe hasło przechodzi dokładnie tę samą drogę co stare: bcrypt z 10 rundami. Gdybyś przypadkiem zapisał tu surowe hasło, właśnie złamałbyś najważniejszą zasadę z maila mentora (*„password nie może być przechowywane jako plain text"*) — to jest miejsce, w którym łatwo o pomyłkę, bo pracujesz z „nowym" hasłem, a nie z „hasłem użytkownika". Uważaj tutaj.

• **`400`, a nie `401`** — wybór celowy. `401 Unauthorized` znaczy „nie jesteś zalogowany, zaloguj się". Tutaj użytkownik **nie może być zalogowany** (przecież nie zna hasła!), więc `401` byłby mylący i mógłby skłonić frontend do próby odświeżenia sesji. `400 Bad Request` = „życzenie jest zrozumiałe, ale nie da się go spełnić z tych danych". Zgodnie z naszym kontraktem API.


---

# KROK 5: Podpięcie nowych tras


## Co robisz:

Modyfikujesz plik **`backend/src/modules/auth/auth.routes.ts`**.

## 🛠️ Fragment A: Import

```ts
import {
    login,
    register,
    me,
    forgotPassword,
    resetPassword,
} from './auth.controller.js';
```

## 🛠️ Fragment B: Rejestracja tras (dopisz na dole)

```ts
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
```

Używaj kodu z rozwagą.

## 🧐 Czemu to robimy i po co to wykorzystamy?

• Bez tego kroku kontrolery istnieją, ale **są nieosiągalne** — nikt ich nie wywoła. To najczęstsze „dlaczego dostaję 404, przecież napisałem kod". Kolejność jest tu ważna: **najpierw kontroler, potem trasa**. Gdybyś zrobił odwrotnie, backend wstawałby z błędem `Route.post() requires a callback function but got a [object Undefined]` — i szukałbyś problemu w niewłaściwym miejscu.

• **Ścieżki są pod `/api/auth`**, bo w `app.ts` router jest podpięty jako `app.use('/api/auth', authRouter)`. Czyli pełny adres to `POST /api/auth/forgot-password`. Trzymamy się konwencji z Etapu 3 — dzięki temu cały moduł uwierzytelniania mieszka w jednym „katalogu" adresów i widać, gdzie szukać.

• **Dlaczego oba to `POST`, a nie `GET`?** Bo oba **zmieniają stan** (tworzą token, zmieniają hasło). `GET` ma być bezpieczny i bez skutków ubocznych — wyobraź sobie, że reset hasła działa przez `GET /reset?token=...`: link mógłby zostać „odwiedzony" przez przedpobieranie w kliencie pocztowym, skaner antywirusowy albo bota i hasło zmieniłoby się bez wiedzy użytkownika. Dodatkowo `POST` nie zostawia tokenu w historii przeglądarki i w logach serwera jako część URL-a requestu.


---

# KROK 6: Testy w `api.http` — TO ZRÓB ZANIM TKNIECZ FRONTEND


## Co robisz:

Dopisujesz na końcu pliku **`backend/api.http`** cztery nowe requesty (Twój plik kończy się na scenariuszu nr 12, więc kontynuujesz numerację).

## Kod, który wpisujesz:

```http
### 13. Reset hasła: prośba o link (zawsze 200, nawet dla nieistniejącego maila)
POST {{baseUrl}}/auth/forgot-password
Content-Type: application/json

{
  "email": "jan@example.com"
}

### 14. Reset hasła: zły token (Błąd -> 400)
POST {{baseUrl}}/auth/reset-password
Content-Type: application/json

{
  "token": "to-nie-jest-prawdziwy-token",
  "password": "noweHaslo12345"
}

### 15. Reset hasła: za krótkie hasło (Błąd -> 422)
POST {{baseUrl}}/auth/reset-password
Content-Type: application/json

{
  "token": "cokolwiek",
  "password": "123"
}

### 16. Logowanie nowym hasłem po resecie
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "jan@example.com",
  "password": "noweHaslo12345"
}
```

Używaj kodu z rozwagą.

## 🧐 Czemu to robimy i po co to wykorzystamy?

• **Bo masz teraz przetestować backend BEZ frontendu.** To jest cała filozofia pracy z tym plikiem: najpierw upewniasz się, że API robi to, co powinno, a dopiero potem budujesz interfejs. Gdy za dwa kroki frontend „nie będzie działał", będziesz wiedział, że problem jest w UI — a nie zastanawiał się, czy backend w ogóle odpowiada.

• **Request 13 to test „happy path" pierwszej połowy.** Po jego wykonaniu idź do **terminala, w którym działa backend** — zobaczysz tam wypisany link:

```
[DEV] Link do resetu hasła dla jan@example.com: http://localhost:5173/reset-password?token=3f8a...
```

Skopiuj z niego sam token (ciąg po `token=`). To będzie potrzebny argument do przetestowania pełnego przepływu — zaraz używamy go w requestcie 14, a potem w przeglądarce w Kroku 9.

• **Request 14 sprawdza, że śmieciowy token dostaje `400`**, a nie `500`. To ważne, bo `500` oznaczałoby, że coś się wywaliło w kodzie (np. brak obsługi `null`), a nie że prawidłowo odrzuciliśmy złe dane.

• **Request 15 sprawdza walidację hasła** — tu nawet nie dochodzimy do bazy, bo zod odbija request z `422`. Zwróć uwagę, że podajemy token `cokolwiek` — i mimo to dostajemy błąd o haśle. To dowód, że walidacja działa **przed** jakąkolwiek logiką bazodanową. Taka jest właśnie zaleta „validate at the boundary".

• **Żeby przetestować prawdziwy happy path (zmianę hasła):** skopiuj token z linku (punkt wyżej) i wykonaj:

```http
### 14b. Reset hasła: prawdziwy token z linku (Sukces -> 200)
POST {{baseUrl}}/auth/reset-password
Content-Type: application/json

{
  "token": "WKLEJ_TOKEN_Z_KONSOLI_BACKENDU",
  "password": "noweHaslo12345"
}
```

A potem request 16 — logowanie **nowym** hasłem. Jeśli zadziała, cała logika backendu jest gotowa.

## ✅ Bramka kontrolna (zanim przejdziesz do frontendu)

- [ ] Request 13 → `200` i link w konsoli backendu
- [ ] W `npm run db:studio` w tabeli `PasswordResetToken` jest rekord, a w kolumnie `tokenHash` jest **długi ciąg hex** (nie token z linku!) — to nie jest kosmetyka, to dowód, że w bazie nie ma nic, czym można się włamać
- [ ] Request 14 (śmieciowy token) → `400`
- [ ] Request 15 (krótkie hasło) → `422`
- [ ] Request 14b z tokenem z konsoli → `200`
- [ ] Request 16 (logowanie nowym hasłem) → `200`
- [ ] Po udanym resecie w Prisma Studio **nie ma już żadnego rekordu** dla tego użytkownika (kasowanie po użyciu)
- [ ] Ten sam token użyty drugi raz → `400` (jednorazowość)
- [ ] Request 13 dwa razy pod rząd → stary token przestaje działać, nowy działa (kasowanie starych przy nowym żądaniu)

**Dopiero gdy wszystkie pola są odhaczone — przechodź dalej.** Backend jest gotowy; teraz robimy do niego interfejs.


---

# KROK 7: Strona „zapomniałem hasła" (`ForgotPasswordPage.tsx`)


## Co robisz:

Tworzysz nowy plik **`frontend/src/pages/ForgotPasswordPage.tsx`**. Struktura będzie znajomo wyglądać — to ten sam wzorzec formularza, którego użyłeś w `LoginPage` i `RegisterForm` (stany → walidacja → fetch → komunikaty).

## Kod, który wpisujesz:

```tsx
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setPending(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Something went wrong. Please try again.');
                setPending(false);
                return;
            }

            // Sukces: pokazujemy komunikat z backendu.
            // Zwróć uwagę, że jest on celowo ogólny — nie mówi, czy konto istnieje.
            setMessage(data.message);
            setEmail('');
            setPending(false);
        } catch {
            setError('Cannot reach the server.');
            setPending(false);
        }
    };

    return (
        <div className='flex min-h-screen items-center justify-center bg-background p-4'>
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        Forgot your password?
                    </CardTitle>
                    <CardDescription className="text-sm">
                        Type your email and we will send you a reset link.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <div
                            role="alert"
                            className='mb-4 border border-destructive/20 bg-destructive/15 p-3 text-center text-sm font-medium text-destructive'
                        >
                            {error}
                        </div>
                    )}

                    {message && (
                        <div
                            role="status"
                            className="mb-4 border border-success/20 bg-success/15 p-3 text-center text-sm font-medium text-success"
                        >
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor="email" className='text-sm font-medium'>Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <Button type='submit' disabled={pending} className='mt-2 w-full'>
                            {pending ? 'Sending...' : 'Send reset link'}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="justify-center pt-0 text-sm text-muted-foreground">
                    <Link to="/login" className="ml-1 underline underline-offset-4 hover:text-primary">
                        Back to log in
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
```

Używaj kodu z rozwagą.

## 🧐 Czemu to robimy i po co to wykorzystamy?

• **Dlaczego ta strona pokazuje komunikat sukcesu nawet dla nieistniejącego maila?** Bo backend celowo niczym nie zdradza, czy konto istnieje (user enumeration z Kroku 3) — więc frontend **musi** zachowywać się tak samo. Gdyby strona mówiła „konto nie istnieje", cała ochrona na backendzie byłaby bez sensu. To jest ładny przykład na to, że **bezpieczeństwo projektuje się w warstwie API, a UI ma je respektować**, a nie odwrotnie.

• **Dlaczego trzymamy komunikat z backendu (`data.message`), a nie wpisujemy własny?** Bo wtedy istnieje jedno źródło prawdy o tym, co się stało. Gdy kiedyś zmienisz treść komunikatu na backendzie, frontend zaktualizuje się sam. Zasada ta sama co przy walidacji: nie duplikuj, jeśli możesz importować (tu: przekazać).

• **Dlaczego pole e-maila nie ma walidacji zod, chociaż w `LoginPage` jest?** Bo to nie jest krytyczna ścieżka — jeśli użytkownik wpisze zły format, backend odbije to `422` i pokażemy komunikat. W tym konkretnym przypadku `type="email"` plus obsługa błędu z API (który i tak przyjdzie) są wystarczające. **Nie każdy formularz potrzebuje pełnej machiny walidacji** — dodawanie jej tylko dlatego, że „tak się robi", to nadmiarowy kod, który trzeba utrzymywać. (Gdybyś jednak chciał spójności: dodaj `forgotPasswordSchema` do `frontend/src/schemas/auth.ts` i waliduj przed `fetch` — oba podejścia są obroną.)

• **Dlaczego `setEmail('')` po sukcesie?** Bo dane są już wysłane, a użytkownik nie ma po co ich oglądać. Ale **nie** czyścimy `message` — komunikat o sukcesie zostaje na ekranie, to cała informacja zwrotna dla użytkownika.

• **Dlaczego link „Back to log in" w stopce?** Zasada UX: **każdy ekran musi mieć drogę wyjścia**. Użytkownik trafił tu z logowania — musi móc wrócić. Bez tego zostaje na „martwej" stronie i klika wstecz w przeglądarce (a tego chcemy unikać w aplikacji z routerem).


---

# KROK 8: Strona „ustaw nowe hasło" (`ResetPasswordPage.tsx`)


## Co robisz:

Tworzysz nowy plik **`frontend/src/pages/ResetPasswordPage.tsx`**. To strona, na którą prowadzi link z maila — czyli musi obsłużyć dwie sytuacje: **ktoś przyszedł z prawidłowym linkiem** (jest `?token=...` w adresie) i **ktoś wszedł tu bez tokenu** (np. wpisał adres ręcznie).

## Kod, który wpisujesz:

```tsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';

export default function ResetPasswordPage() {
    // Wyciągamy token z adresu: /reset-password?token=XYZ
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setMessage('');

        // Sprawdzenie po stronie frontendu — po prostu szybciej niż request do serwera.
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setPending(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'This reset link is invalid or has expired.');
                setPending(false);
                return;
            }

            setMessage(data.message);
            setPending(false);

            // Po 2 sekundach przenosimy użytkownika na logowanie,
            // żeby zdążył przeczytać komunikat sukcesu.
            setTimeout(() => navigate('/login', { replace: true }), 2000);
        } catch {
            setError('Cannot reach the server.');
            setPending(false);
        }
    };

    // Zabezpieczenie: użytkownik wszedł na stronę bez tokenu w adresie.
    if (!token) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
                <p className="text-destructive">This reset link is incomplete.</p>
                <Link to="/forgot-password" className="text-sm underline underline-offset-4 hover:text-primary">
                    Request a new link
                </Link>
            </div>
        );
    }

    return (
        <div className='flex min-h-screen items-center justify-center bg-background p-4'>
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        Set a new password
                    </CardTitle>
                    <CardDescription className="text-sm">
                        This link is valid for 30 minutes.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <div
                            role="alert"
                            className='mb-4 border border-destructive/20 bg-destructive/15 p-3 text-center text-sm font-medium text-destructive'
                        >
                            <p>{error}</p>
                            <Link
                                to="/forgot-password"
                                className="mt-1 inline-block underline underline-offset-4"
                            >
                                Request a new link
                            </Link>
                        </div>
                    )}

                    {message && (
                        <div
                            role="status"
                            className="mb-4 border border-success/20 bg-success/15 p-3 text-center text-sm font-medium text-success"
                        >
                            {message} Redirecting to log in...
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor="password" className='text-sm font-medium'>New password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor="confirmPassword" className='text-sm font-medium'>
                                Confirm new password
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <Button type='submit' disabled={pending} className='mt-2 w-full'>
                            {pending ? 'Saving...' : 'Reset password'}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="justify-center pt-0 text-sm text-muted-foreground">
                    <Link to="/forgot-password" className="ml-1 underline underline-offset-4 hover:text-primary">
                        Request a new link
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
```

Używaj kodu z rozwagą.

## 🧐 Czemu to robimy i po co to wykorzystamy?

• **`useSearchParams` + `searchParams.get('token')`** — tak czytamy parametry z adresu URL. Backend zbudował link jako `.../reset-password?token=abc123`, a router w przeglądarce widzi część `?token=abc123` jako tzw. query string. `useSearchParams` to hook z react-routera, który daje do niej dostęp (bez ręcznego parsowania `window.location.href` i wyciągania stringów — a to właśnie tam ludzie robią błędy).

• **Token NIE jest zapisywany w `useState` ani nigdzie indziej** — po prostu czytamy go z adresu przy każdym renderze i wysyłamy do backendu. To celowe: token z URL-a i tak zostaje w historii przeglądarki; nie ma sensu robić z niego dodatkowej kopii w pamięci aplikacji.

• **Sprawdzenie `if (password !== confirmPassword)` po stronie frontendu** — to nie jest bezpieczeństwo (ktoś może to obejść), to **oszczędzenie requestu i czasu użytkownika**. Gdyby hasła się różniły, wysłalibyśmy request, backend zapisałby hasło z pola `password` (i nie wiedziałby nawet, że drugie pole istniało), a użytkownik byłby przekonany, że wpisał coś innego. Dlatego tutaj — inaczej niż w `RegisterForm`, gdzie mieliśmy to w zod — wystarczy prosty `if`. Chodzi o wynik, nie o narzędzie.

• **`if (!token)` przed renderem formularza** — to tzw. **guard clause** (klauzula strażnicza). Wyobraź sobie, że użytkownik wpisuje `localhost:5173/reset-password` bez tokenu (bo zgubił część linku). Bez tego sprawdzenia formularz by się pokazał, użytkownik wpisałby nowe hasło, kliknął, a backend odpowiedziałby „invalid token" — czyli frustracja i poczucie, że „strona jest zepsuta". Z guardem od razu widzi: „link jest niekompletny, poproś o nowy" — i ma przycisk, żeby to zrobić. **Komunikat + wyjście awaryjne.**

• **Nawet przy błędzie (np. wygasły token) pokazujemy link „Request a new link"** — bo to jedyne sensowne działanie, jakie użytkownik może w tym momencie podjąć. Pomyśl o tym jak o projekcie UX: dla każdego błędu musi istnieć **następny krok**.

• **`setTimeout(() => navigate('/login', { replace: true }), 2000)`** — automatyczne przeniesienie na logowanie po 2 sekundach. Dwie rzeczy warte uwagi:
  1. **opóźnienie** jest po to, żeby użytkownik zdążył przeczytać „Password has been reset" — natychmiastowe przekierowanie wygląda jak błąd,
  2. **`{ replace: true }`** sprawia, że strona z resetem **nie zostaje w historii przeglądarki** — kliknięcie „wstecz" nie cofnie użytkownika na ekran z tokenem. To samo robisz w `LoginPage` po udanym logowaniu (pamiętasz `navigate(from ?? '/dashboard', { replace: true })`).

• **Ten sam wzorzec obsługi błędów co wszędzie:** `!response.ok` → pokaż `data.message` → `setPending(false)` → `return`. I `catch` → „Cannot reach the server." + `setPending(false)`. Nigdy nie zapominaj o tym drugim `setPending(false)` — to dokładnie ten bug, który naprawiałeś w `LoginPage`.

• **Tekst „This link is valid for 30 minutes."** jest tu nieprzypadkowo — informuje użytkownika, że jeśli link ma już pół godziny, to nie zadziała. Dzięki temu komunikat „invalid or expired" nie jest zaskoczeniem, a wnioskiem. **Dobry UI uprzedza problemy, zamiast tłumaczyć je po fakcie.**


---

# KROK 9: Zarejestrowanie tras i link do strony


## Co robisz:

Dwie małe zmiany, bez których strony istnieją, ale nikt na nie nie trafi.

## 🛠️ Fragment A: `frontend/src/App.tsx`

**Kod, który wpisujesz (importy na górze + dwie nowe trasy):**

```tsx
import { BrowserRouter, Route, Routes } from 'react-router';
import RegisterForm from '@/pages/RegisterForm';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/register' element={<RegisterForm />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route path='/reset-password' element={<ResetPasswordPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

Używaj kodu z rozwagą.

## 🛠️ Fragment B: link na stronie logowania

**Kod, który wpisujesz (w `frontend/src/pages/LoginPage.tsx`, w `CardFooter`, dopisując nad istniejącym linkiem do rejestracji):**

```tsx
                <CardFooter className="flex-col gap-2 justify-center pt-0 text-sm text-muted-foreground">
                    <Link to="/forgot-password" className="underline underline-offset-4 hover:text-primary">
                        Forgot your password?
                    </Link>

                    <div>
                        Don't have an account?
                        <Link to="/register" className="ml-1 underline underline-offset-4 hover:text-primary">
                            Sign up
                        </Link>
                    </div>
                </CardFooter>
```

Używaj kodu z rozwagą.

## 🧐 Czemu to robimy i po co to wykorzystamy?

• **Trasa `path='/reset-password'` celowo NIE ma w ścieżce żadnego `:token`.** Adres docelowy to `/reset-password?token=XYZ` — token jest parametrem zapytania, a nie częścią ścieżki. Różnica ma znaczenie: w `/reset-password/:token` token byłby w „segmencie" adresu i wymagałby innego odczytu; w formie `?token=XYZ` obsługuje go `useSearchParams`, którym operujesz w komponencie. Wybrałeś formę zgodną z tym, jak link buduje backend (`${env.FRONTEND_URL}/reset-password?token=${token}`) — i to jest spójność, o którą chodzi.

• **Link „Forgot your password?" na stronie logowania** zamyka pętlę UX: użytkownik, który nie pamięta hasła, **zaczyna od ekranu, na którym się zaciął** — a nie od szukania w pomocy. To standard, który widzisz w każdej aplikacji. Dodatkowo zmieniamy `CardFooter` na układ kolumnowy, bo mamy teraz dwa linki jeden pod drugim.

• **Kolejność tras w `Routes` nie ma znaczenia** (react-router dopasowuje po ścieżce), ale **kolejność importów i spójność stylu** już tak — trzymaj się tego, co już masz w pliku.


---

# KROK 10: Test całego przepływu end-to-end


## Co robisz:

Przechodzisz przez pełną ścieżkę użytkownika — tak, jakbyś sam zapomniał hasła. Wszystko z przeglądarki, bez `api.http`.

## Testy krok po kroku:

**Test 1 — czy strony się otwierają**

Wejdź na `http://localhost:5173/forgot-password` → ma się pokazać formularz z polem e-mail.
Wejdź na `http://localhost:5173/reset-password` (bez tokenu) → ma się pokazać „This reset link is incomplete." + link „Request a new link".

**Test 2 — prośba o link**

Na `/forgot-password` wpisz e-mail istniejącego konta (np. `jan@example.com`) → klik „Send reset link".
✅ Oczekiwane: zielony komunikat „If an account with that email exists, a reset link has been sent."
Teraz spójrz w **terminal backendu** — jest tam linia `[DEV] Link do resetu hasła...` z całym linkiem.

**Test 3 — czy nie zdradzamy, kto ma konto**

Zrób to samo z **nieistniejącym** mailem (np. `nie-ma-takiego@example.com`).
✅ Oczekiwane: **dokładnie ten sam komunikat i ten sam status**. Jeśli różnica jest choćby w treści — ochrona przed user enumeration nie działa.

**Test 4 — pełny happy path**

Skopiuj link z konsoli backendu i wklej go do przeglądarki (albo tylko dopisz token do `localhost:5173/reset-password?token=...`). Ustaw nowe hasło (min. 8 znaków), potwierdź je i kliknij „Reset password".
✅ Oczekiwane: komunikat „Password has been reset. You can log in now. Redirecting to log in..." → po ~2 sekundach sam przenosi na `/login`.

**Test 5 — czy nowe hasło działa**

Zaloguj się na `/login` **nowym** hasłem. ✅ Ma działać.
Sprawdź też **starym** hasłem — ✅ ma zwrócić „Invalid email or password".

**Test 6 — jednorazowość linku**

Wróć w przeglądarce do linku z resetem (albo wklej go ponownie) i spróbuj użyć go drugi raz.
✅ Oczekiwane: „This reset link is invalid or has expired." + link „Request a new link".

**Test 7 — czystość w bazie**

Otwórz `npm run db:studio` (folder `backend/`) → tabela `PasswordResetToken`.
✅ Oczekiwane: dla tego użytkownika **nie ma żadnego rekordu** — token został skasowany przy użyciu.

**Test 8 — stary link umiera przy nowym żądaniu**

Poproś o nowy link (`/forgot-password`), skopiuj go, ale **nie używaj**. Poproś o link jeszcze raz. Spróbuj użyć tego **pierwszego**.
✅ Oczekiwane: `400` / komunikat o nieważnym linku — bo przy drugim żądaniu backend skasował starsze tokeny.

**Test 9 — czy w bazie naprawdę jest hash**

W Prisma Studio otwórz rekord w `PasswordResetToken` i porównaj kolumnę `tokenHash` z tokenem z linku.
✅ Oczekiwane: to **zupełnie inne ciągi znaków**. Jeśli są takie same — do bazy leci surowy token i trzeba wrócić do Kroku 3.

**Test 10 — kompilacja**

```bash
cd frontend
npx tsc -b
npm run lint
```

✅ Oba bez błędów.


---

# ✅ Checklista końcowa Etapu 4

- [ ] `backend/src/utils/token.ts` istnieje i eksportuje `generateResetToken` + `hashResetToken`
- [ ] `POST /api/auth/forgot-password` → zawsze `200` z jednolitym komunikatem
- [ ] `POST /api/auth/reset-password` → zmienia hasło, kasuje tokeny, obsługuje wygasłe
- [ ] Stare tokeny są kasowane przy nowym żądaniu
- [ ] Token jest kasowany po użyciu (potwierdzone w Prisma Studio)
- [ ] W bazie jest **hash**, nie token (Test 9)
- [ ] Wszystkie 4 requesty (13–16) w `api.http` przetestowane
- [ ] `/forgot-password` i `/reset-password` działają z przeglądarki
- [ ] Nieistniejący e-mail daje identyczną odpowiedź jak istniejący (Test 3)
- [ ] Pełny przepływ: forgot → link → nowe hasło → login nowym hasłem ✅
- [ ] `npx tsc -b` i `npm run lint` przechodzą
- [ ] **Skasowanie użytkownika kasuje jego tokeny** — sprawdź w Prisma Studio: usuń testowego usera i zobacz, że jego tokeny zniknęły razem z nim (to zasługa `onDelete: Cascade` z Etapu 2 — mentor prosił o to wprost; warto zobaczyć, że działa)


---

# 🔜 Co po tym etapie i co zostaje do zrobienia

## Zostaje jedno `TODO`: wysyłka maila

Mentor napisał: *„Nie musisz robić wysyłania maila"* — więc ten etap możesz zamknąć z `console.log`. Gdy będziesz chciał to dokończyć, wygląda to tak:

1. Instalujesz bibliotekę: `npm i nodemailer` (albo używasz API Resend/SendGrid).
2. Tworzysz `backend/src/utils/mailer.ts` z funkcją `sendResetPasswordEmail(to, resetLink)`.
3. W `forgotPassword` zamieniasz `console.log(...)` na wywołanie tej funkcji.
4. **Usuwasz logowanie linku z konsoli** — na produkcji ma go nie być (to luka bezpieczeństwa).
5. W `.env` dodajesz dane SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) i **aktualizujesz `.env.example`**.
6. Do testów w dev użyj Mailtrapa albo MailHoga — zobaczysz maile bez wysyłania ich na świat.

## Dodatkowe `TODO` na później (Etap produkcji)

- `express-rate-limit` na `/forgot-password` — żeby ktoś nie mógł zasypać użytkownika mailami ani spamować bazą tokenów,
- logowanie zdarzeń („ktoś poprosił o reset dla X") — ale bez tokenów w logach,
- informowanie użytkownika mailem „Twoje hasło zostało zmienione" (gdyby ktoś je jednak przejął, użytkownik się o tym dowie).

## Co dalej w planie

Kolejny etap to **sesja i ochrona tras**: wspólny `apiFetch` (żeby nie powtarzać `fetch` z nagłówkiem `Authorization` w każdym komponencie), `AuthContext` (jedno miejsce, które wie, kto jest zalogowany), `ProtectedRoute` (blokada `/dashboard` dla niezalogowanych) i sam dashboard. Wtedy część kodu, który dziś żyje w `LoginPage`, przeniesie się „piętro wyżej" — i to jest normalne, tak się kod rozwija.

**Zanim tam pójdziemy:** domknij checklistę powyżej i zdaj mi relację — szczególnie z Testu 3 (jednakowe komunikaty), Testu 6 (jednorazowość) i Testu 9 (hash w bazie). To są trzy miejsca, w których najczęściej coś umyka i które mentor sprawdzi w pierwszej kolejności.