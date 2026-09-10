// Gabarits d'e-mails d'authentification, à la marque Les 2 Palmiers, 10 langues.
// Utilisés par le hook « Send Email » (fonction auth-email).

export type AuthAction =
  | "signup"
  | "recovery"
  | "magiclink"
  | "invite"
  | "email_change"
  | "reauthentication";

export const AUTH_LOCALES = [
  "fr",
  "en",
  "es",
  "zh",
  "ar",
  "pt",
  "de",
  "it",
  "ru",
  "ja",
] as const;
export type AuthLocale = (typeof AUTH_LOCALES)[number];

type Copy = {
  subject: string;
  heading: string;
  body: string;
  cta: string;
  codeHint: string; // « ou saisissez ce code : »
  ignore: string; // note de bas de page
};

// dict[action][locale]
export const AUTH_COPY: Record<AuthAction, Record<AuthLocale, Copy>> = {
  signup: {
    fr: { subject: "Confirmez votre adresse — Les 2 Palmiers", heading: "Bienvenue", body: "Confirmez votre adresse e-mail pour activer votre compte Les 2 Palmiers.", cta: "Confirmer mon adresse", codeHint: "Ou saisissez ce code :", ignore: "Vous n'êtes pas à l'origine de cette demande ? Ignorez cet e-mail." },
    en: { subject: "Confirm your email — Les 2 Palmiers", heading: "Welcome", body: "Confirm your email address to activate your Les 2 Palmiers account.", cta: "Confirm my email", codeHint: "Or enter this code:", ignore: "Didn't request this? You can safely ignore this email." },
    es: { subject: "Confirme su correo — Les 2 Palmiers", heading: "Bienvenido", body: "Confirme su dirección de correo para activar su cuenta de Les 2 Palmiers.", cta: "Confirmar mi correo", codeHint: "O introduzca este código:", ignore: "¿No fue usted? Puede ignorar este correo." },
    zh: { subject: "确认您的邮箱 — Les 2 Palmiers", heading: "欢迎", body: "确认您的电子邮箱地址以激活您的 Les 2 Palmiers 账户。", cta: "确认我的邮箱", codeHint: "或输入此验证码：", ignore: "如非本人操作，请忽略此邮件。" },
    ar: { subject: "أكّد بريدك الإلكتروني — Les 2 Palmiers", heading: "مرحبًا", body: "أكّد عنوان بريدك الإلكتروني لتفعيل حسابك في Les 2 Palmiers.", cta: "تأكيد بريدي", codeHint: "أو أدخل هذا الرمز:", ignore: "لم تطلب هذا؟ يمكنك تجاهل هذه الرسالة بأمان." },
    pt: { subject: "Confirme o seu e-mail — Les 2 Palmiers", heading: "Bem-vindo", body: "Confirme o seu endereço de e-mail para ativar a sua conta Les 2 Palmiers.", cta: "Confirmar o meu e-mail", codeHint: "Ou introduza este código:", ignore: "Não foi você? Pode ignorar este e-mail." },
    de: { subject: "Bestätigen Sie Ihre E-Mail — Les 2 Palmiers", heading: "Willkommen", body: "Bestätigen Sie Ihre E-Mail-Adresse, um Ihr Les 2 Palmiers-Konto zu aktivieren.", cta: "E-Mail bestätigen", codeHint: "Oder geben Sie diesen Code ein:", ignore: "Sie haben das nicht angefordert? Sie können diese E-Mail ignorieren." },
    it: { subject: "Conferma la tua e-mail — Les 2 Palmiers", heading: "Benvenuto", body: "Conferma il tuo indirizzo e-mail per attivare il tuo account Les 2 Palmiers.", cta: "Conferma la mia e-mail", codeHint: "Oppure inserisci questo codice:", ignore: "Non sei stato tu? Puoi ignorare questa e-mail." },
    ru: { subject: "Подтвердите e-mail — Les 2 Palmiers", heading: "Добро пожаловать", body: "Подтвердите адрес электронной почты, чтобы активировать аккаунт Les 2 Palmiers.", cta: "Подтвердить e-mail", codeHint: "Или введите этот код:", ignore: "Вы не запрашивали это? Просто проигнорируйте письмо." },
    ja: { subject: "メールアドレスの確認 — Les 2 Palmiers", heading: "ようこそ", body: "メールアドレスを確認して、Les 2 Palmiers アカウントを有効化してください。", cta: "メールを確認", codeHint: "またはこのコードを入力：", ignore: "心当たりがない場合は、このメールを無視してください。" },
  },
  recovery: {
    fr: { subject: "Réinitialisez votre mot de passe — Les 2 Palmiers", heading: "Mot de passe oublié", body: "Vous avez demandé la réinitialisation de votre mot de passe.", cta: "Choisir un nouveau mot de passe", codeHint: "Ou saisissez ce code :", ignore: "Vous n'êtes pas à l'origine de cette demande ? Ignorez cet e-mail, votre mot de passe reste inchangé." },
    en: { subject: "Reset your password — Les 2 Palmiers", heading: "Forgot your password", body: "You requested a password reset.", cta: "Choose a new password", codeHint: "Or enter this code:", ignore: "Didn't request this? Ignore this email — your password stays unchanged." },
    es: { subject: "Restablezca su contraseña — Les 2 Palmiers", heading: "Contraseña olvidada", body: "Ha solicitado restablecer su contraseña.", cta: "Elegir una nueva contraseña", codeHint: "O introduzca este código:", ignore: "¿No fue usted? Ignore este correo, su contraseña no cambia." },
    zh: { subject: "重置您的密码 — Les 2 Palmiers", heading: "忘记密码", body: "您请求重置密码。", cta: "设置新密码", codeHint: "或输入此验证码：", ignore: "如非本人操作，请忽略此邮件，密码保持不变。" },
    ar: { subject: "إعادة تعيين كلمة المرور — Les 2 Palmiers", heading: "نسيت كلمة المرور", body: "لقد طلبت إعادة تعيين كلمة المرور.", cta: "اختيار كلمة مرور جديدة", codeHint: "أو أدخل هذا الرمز:", ignore: "لم تطلب هذا؟ تجاهل الرسالة، وستبقى كلمة مرورك دون تغيير." },
    pt: { subject: "Redefina a sua palavra-passe — Les 2 Palmiers", heading: "Palavra-passe esquecida", body: "Pediu a redefinição da sua palavra-passe.", cta: "Escolher uma nova palavra-passe", codeHint: "Ou introduza este código:", ignore: "Não foi você? Ignore este e-mail, a sua palavra-passe permanece inalterada." },
    de: { subject: "Passwort zurücksetzen — Les 2 Palmiers", heading: "Passwort vergessen", body: "Sie haben das Zurücksetzen Ihres Passworts angefordert.", cta: "Neues Passwort wählen", codeHint: "Oder geben Sie diesen Code ein:", ignore: "Nicht angefordert? Ignorieren Sie diese E-Mail — Ihr Passwort bleibt unverändert." },
    it: { subject: "Reimposta la password — Les 2 Palmiers", heading: "Password dimenticata", body: "Hai richiesto la reimpostazione della password.", cta: "Scegli una nuova password", codeHint: "Oppure inserisci questo codice:", ignore: "Non sei stato tu? Ignora questa e-mail, la password resta invariata." },
    ru: { subject: "Сброс пароля — Les 2 Palmiers", heading: "Забыли пароль", body: "Вы запросили сброс пароля.", cta: "Выбрать новый пароль", codeHint: "Или введите этот код:", ignore: "Вы не запрашивали это? Проигнорируйте письмо — пароль не изменится." },
    ja: { subject: "パスワードの再設定 — Les 2 Palmiers", heading: "パスワードをお忘れの場合", body: "パスワードの再設定がリクエストされました。", cta: "新しいパスワードを設定", codeHint: "またはこのコードを入力：", ignore: "心当たりがない場合は無視してください。パスワードは変更されません。" },
  },
  magiclink: {
    fr: { subject: "Votre lien de connexion — Les 2 Palmiers", heading: "Connexion", body: "Voici votre lien de connexion sécurisé.", cta: "Me connecter", codeHint: "Ou saisissez ce code :", ignore: "Vous n'avez pas demandé à vous connecter ? Ignorez cet e-mail." },
    en: { subject: "Your sign-in link — Les 2 Palmiers", heading: "Sign in", body: "Here is your secure sign-in link.", cta: "Sign in", codeHint: "Or enter this code:", ignore: "Didn't try to sign in? You can ignore this email." },
    es: { subject: "Su enlace de acceso — Les 2 Palmiers", heading: "Iniciar sesión", body: "Aquí tiene su enlace de acceso seguro.", cta: "Iniciar sesión", codeHint: "O introduzca este código:", ignore: "¿No intentó iniciar sesión? Ignore este correo." },
    zh: { subject: "您的登录链接 — Les 2 Palmiers", heading: "登录", body: "这是您的安全登录链接。", cta: "登录", codeHint: "或输入此验证码：", ignore: "如非本人操作，请忽略此邮件。" },
    ar: { subject: "رابط تسجيل الدخول — Les 2 Palmiers", heading: "تسجيل الدخول", body: "إليك رابط تسجيل الدخول الآمن.", cta: "تسجيل الدخول", codeHint: "أو أدخل هذا الرمز:", ignore: "لم تحاول تسجيل الدخول؟ يمكنك تجاهل هذه الرسالة." },
    pt: { subject: "O seu link de acesso — Les 2 Palmiers", heading: "Entrar", body: "Aqui está o seu link de acesso seguro.", cta: "Entrar", codeHint: "Ou introduza este código:", ignore: "Não tentou entrar? Pode ignorar este e-mail." },
    de: { subject: "Ihr Anmeldelink — Les 2 Palmiers", heading: "Anmelden", body: "Hier ist Ihr sicherer Anmeldelink.", cta: "Anmelden", codeHint: "Oder geben Sie diesen Code ein:", ignore: "Nicht versucht sich anzumelden? Ignorieren Sie diese E-Mail." },
    it: { subject: "Il tuo link di accesso — Les 2 Palmiers", heading: "Accedi", body: "Ecco il tuo link di accesso sicuro.", cta: "Accedi", codeHint: "Oppure inserisci questo codice:", ignore: "Non hai provato ad accedere? Ignora questa e-mail." },
    ru: { subject: "Ссылка для входа — Les 2 Palmiers", heading: "Вход", body: "Ваша защищённая ссылка для входа.", cta: "Войти", codeHint: "Или введите этот код:", ignore: "Не пытались войти? Проигнорируйте письмо." },
    ja: { subject: "ログイン用リンク — Les 2 Palmiers", heading: "ログイン", body: "安全なログイン用リンクです。", cta: "ログイン", codeHint: "またはこのコードを入力：", ignore: "ログインを試みていない場合は無視してください。" },
  },
  invite: {
    fr: { subject: "Vous êtes invité(e) — Les 2 Palmiers", heading: "Invitation", body: "Vous êtes invité(e) à rejoindre l'espace Les 2 Palmiers.", cta: "Accepter l'invitation", codeHint: "Ou saisissez ce code :", ignore: "Vous ne vous attendiez pas à cette invitation ? Ignorez cet e-mail." },
    en: { subject: "You're invited — Les 2 Palmiers", heading: "Invitation", body: "You've been invited to join the Les 2 Palmiers workspace.", cta: "Accept the invitation", codeHint: "Or enter this code:", ignore: "Not expecting this invitation? You can ignore this email." },
    es: { subject: "Está invitado — Les 2 Palmiers", heading: "Invitación", body: "Le han invitado a unirse al espacio de Les 2 Palmiers.", cta: "Aceptar la invitación", codeHint: "O introduzca este código:", ignore: "¿No esperaba esta invitación? Ignore este correo." },
    zh: { subject: "您收到邀请 — Les 2 Palmiers", heading: "邀请", body: "您受邀加入 Les 2 Palmiers 工作空间。", cta: "接受邀请", codeHint: "或输入此验证码：", ignore: "如非预期的邀请，请忽略此邮件。" },
    ar: { subject: "أنت مدعو — Les 2 Palmiers", heading: "دعوة", body: "تمت دعوتك للانضمام إلى مساحة Les 2 Palmiers.", cta: "قبول الدعوة", codeHint: "أو أدخل هذا الرمز:", ignore: "لم تكن تتوقع هذه الدعوة؟ تجاهل الرسالة." },
    pt: { subject: "Está convidado — Les 2 Palmiers", heading: "Convite", body: "Foi convidado a juntar-se ao espaço Les 2 Palmiers.", cta: "Aceitar o convite", codeHint: "Ou introduza este código:", ignore: "Não esperava este convite? Pode ignorar este e-mail." },
    de: { subject: "Sie sind eingeladen — Les 2 Palmiers", heading: "Einladung", body: "Sie wurden eingeladen, dem Les 2 Palmiers-Bereich beizutreten.", cta: "Einladung annehmen", codeHint: "Oder geben Sie diesen Code ein:", ignore: "Diese Einladung nicht erwartet? Ignorieren Sie diese E-Mail." },
    it: { subject: "Sei invitato — Les 2 Palmiers", heading: "Invito", body: "Sei stato invitato a unirti allo spazio Les 2 Palmiers.", cta: "Accetta l'invito", codeHint: "Oppure inserisci questo codice:", ignore: "Non ti aspettavi questo invito? Ignora questa e-mail." },
    ru: { subject: "Вас пригласили — Les 2 Palmiers", heading: "Приглашение", body: "Вас пригласили в рабочее пространство Les 2 Palmiers.", cta: "Принять приглашение", codeHint: "Или введите этот код:", ignore: "Не ждали приглашения? Проигнорируйте письмо." },
    ja: { subject: "招待が届いています — Les 2 Palmiers", heading: "招待", body: "Les 2 Palmiers のワークスペースに招待されました。", cta: "招待を受ける", codeHint: "またはこのコードを入力：", ignore: "心当たりがない場合は、このメールを無視してください。" },
  },
  email_change: {
    fr: { subject: "Confirmez votre nouvelle adresse — Les 2 Palmiers", heading: "Changement d'adresse", body: "Confirmez votre nouvelle adresse e-mail pour l'associer à votre compte.", cta: "Confirmer la nouvelle adresse", codeHint: "Ou saisissez ce code :", ignore: "Vous n'êtes pas à l'origine de ce changement ? Contactez-nous immédiatement." },
    en: { subject: "Confirm your new email — Les 2 Palmiers", heading: "Email change", body: "Confirm your new email address to link it to your account.", cta: "Confirm the new email", codeHint: "Or enter this code:", ignore: "Didn't request this change? Contact us right away." },
    es: { subject: "Confirme su nuevo correo — Les 2 Palmiers", heading: "Cambio de correo", body: "Confirme su nueva dirección de correo para vincularla a su cuenta.", cta: "Confirmar el nuevo correo", codeHint: "O introduzca este código:", ignore: "¿No solicitó este cambio? Contáctenos de inmediato." },
    zh: { subject: "确认您的新邮箱 — Les 2 Palmiers", heading: "邮箱变更", body: "确认您的新电子邮箱地址，将其绑定到您的账户。", cta: "确认新邮箱", codeHint: "或输入此验证码：", ignore: "如非本人操作，请立即与我们联系。" },
    ar: { subject: "أكّد بريدك الجديد — Les 2 Palmiers", heading: "تغيير البريد", body: "أكّد عنوان بريدك الإلكتروني الجديد لربطه بحسابك.", cta: "تأكيد البريد الجديد", codeHint: "أو أدخل هذا الرمز:", ignore: "لم تطلب هذا التغيير؟ تواصل معنا فورًا." },
    pt: { subject: "Confirme o seu novo e-mail — Les 2 Palmiers", heading: "Alteração de e-mail", body: "Confirme o seu novo endereço de e-mail para o associar à sua conta.", cta: "Confirmar o novo e-mail", codeHint: "Ou introduza este código:", ignore: "Não pediu esta alteração? Contacte-nos de imediato." },
    de: { subject: "Neue E-Mail bestätigen — Les 2 Palmiers", heading: "E-Mail-Änderung", body: "Bestätigen Sie Ihre neue E-Mail-Adresse, um sie mit Ihrem Konto zu verknüpfen.", cta: "Neue E-Mail bestätigen", codeHint: "Oder geben Sie diesen Code ein:", ignore: "Diese Änderung nicht angefordert? Kontaktieren Sie uns sofort." },
    it: { subject: "Conferma la nuova e-mail — Les 2 Palmiers", heading: "Cambio e-mail", body: "Conferma il tuo nuovo indirizzo e-mail per collegarlo al tuo account.", cta: "Conferma la nuova e-mail", codeHint: "Oppure inserisci questo codice:", ignore: "Non hai richiesto questo cambio? Contattaci subito." },
    ru: { subject: "Подтвердите новый e-mail — Les 2 Palmiers", heading: "Смена e-mail", body: "Подтвердите новый адрес электронной почты, чтобы привязать его к аккаунту.", cta: "Подтвердить новый e-mail", codeHint: "Или введите этот код:", ignore: "Вы не запрашивали смену? Немедленно свяжитесь с нами." },
    ja: { subject: "新しいメールアドレスの確認 — Les 2 Palmiers", heading: "メールアドレスの変更", body: "新しいメールアドレスを確認して、アカウントに関連付けてください。", cta: "新しいメールを確認", codeHint: "またはこのコードを入力：", ignore: "心当たりがない場合は、すぐにご連絡ください。" },
  },
  reauthentication: {
    fr: { subject: "Votre code de vérification — Les 2 Palmiers", heading: "Vérification", body: "Utilisez le code ci-dessous pour confirmer votre identité.", cta: "", codeHint: "Votre code :", ignore: "Vous n'êtes pas à l'origine de cette demande ? Ignorez cet e-mail." },
    en: { subject: "Your verification code — Les 2 Palmiers", heading: "Verification", body: "Use the code below to confirm your identity.", cta: "", codeHint: "Your code:", ignore: "Didn't request this? You can ignore this email." },
    es: { subject: "Su código de verificación — Les 2 Palmiers", heading: "Verificación", body: "Use el código de abajo para confirmar su identidad.", cta: "", codeHint: "Su código:", ignore: "¿No fue usted? Puede ignorar este correo." },
    zh: { subject: "您的验证码 — Les 2 Palmiers", heading: "验证", body: "使用下方验证码确认您的身份。", cta: "", codeHint: "您的验证码：", ignore: "如非本人操作，请忽略此邮件。" },
    ar: { subject: "رمز التحقق الخاص بك — Les 2 Palmiers", heading: "تحقّق", body: "استخدم الرمز أدناه لتأكيد هويتك.", cta: "", codeHint: "رمزك:", ignore: "لم تطلب هذا؟ يمكنك تجاهل هذه الرسالة." },
    pt: { subject: "O seu código de verificação — Les 2 Palmiers", heading: "Verificação", body: "Use o código abaixo para confirmar a sua identidade.", cta: "", codeHint: "O seu código:", ignore: "Não foi você? Pode ignorar este e-mail." },
    de: { subject: "Ihr Bestätigungscode — Les 2 Palmiers", heading: "Bestätigung", body: "Verwenden Sie den Code unten, um Ihre Identität zu bestätigen.", cta: "", codeHint: "Ihr Code:", ignore: "Nicht angefordert? Sie können diese E-Mail ignorieren." },
    it: { subject: "Il tuo codice di verifica — Les 2 Palmiers", heading: "Verifica", body: "Usa il codice qui sotto per confermare la tua identità.", cta: "", codeHint: "Il tuo codice:", ignore: "Non sei stato tu? Puoi ignorare questa e-mail." },
    ru: { subject: "Ваш код подтверждения — Les 2 Palmiers", heading: "Подтверждение", body: "Используйте код ниже, чтобы подтвердить личность.", cta: "", codeHint: "Ваш код:", ignore: "Вы не запрашивали это? Проигнорируйте письмо." },
    ja: { subject: "確認コード — Les 2 Palmiers", heading: "確認", body: "以下のコードで本人確認を行ってください。", cta: "", codeHint: "コード：", ignore: "心当たりがない場合は、このメールを無視してください。" },
  },
};

export function resolveLocale(v: unknown): AuthLocale {
  const s = typeof v === "string" ? v.slice(0, 2).toLowerCase() : "";
  return (AUTH_LOCALES as readonly string[]).includes(s) ? (s as AuthLocale) : "fr";
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** Rend l'e-mail HTML à la marque. `link` vide => e-mail à code seul. */
export function renderAuthEmail(opts: {
  locale: AuthLocale;
  action: AuthAction;
  link: string;
  token: string;
}): { subject: string; html: string } {
  const c = AUTH_COPY[opts.action][opts.locale];
  const dir = opts.locale === "ar" ? "rtl" : "ltr";
  const button =
    opts.link && c.cta
      ? `<div style="text-align:center;margin:8px 0 20px;"><a href="${esc(opts.link)}" style="background:#14315b;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 30px;border-radius:999px;display:inline-block;font-size:14px;">${esc(c.cta)}</a></div>`
      : "";
  const code = opts.token
    ? `<p style="margin:0 0 6px;color:#6f665a;font-size:13px;text-align:center;">${esc(c.codeHint)}</p>
       <p style="margin:0 0 20px;text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:26px;letter-spacing:5px;color:#14315b;font-weight:700;">${esc(opts.token)}</p>`
    : "";
  const html = `<!doctype html><html lang="${opts.locale}" dir="${dir}"><body style="margin:0;background:#f6f3ec;">
<table role="presentation" width="100%" style="background:#f6f3ec;padding:32px 12px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;"><tr><td align="center">
<table role="presentation" width="480" style="max-width:480px;background:#fff;border:1px solid #e0d6c3;border-radius:14px;overflow:hidden;">
<tr><td style="background:#14315b;padding:22px 32px 18px;text-align:center;"><img src="https://les2palmiers.site/brand/wordmark-light.png" alt="Les 2 Palmiers" height="30" style="height:30px;width:auto;"></td></tr>
<tr><td style="height:3px;background:#aa6548;font-size:0;line-height:3px;">&nbsp;</td></tr>
<tr><td style="padding:30px 32px;color:#16130f;font-size:15px;line-height:1.6;" dir="${dir}">
<p style="margin:0 0 8px;font-weight:700;font-size:17px;">${esc(c.heading)}</p>
<p style="margin:0 0 20px;color:#3c352c;">${esc(c.body)}</p>
${button}
${code}
<p style="margin:18px 0 0;color:#8a8073;font-size:12.5px;">${esc(c.ignore)}</p>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #ece4d5;color:#6f665a;font-size:13px;text-align:center;">les2palmiers.site</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: c.subject, html };
}
