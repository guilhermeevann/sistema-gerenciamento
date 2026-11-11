// Aplica o tema salvo (ou o do sistema) antes da primeira pintura. Roda inline no <head>
// do layout; o ThemeToggle usa a mesma chave e a mesma regra depois da hidratação.
export const THEME_KEY = 'theme';

export const themeScript = `(function(){try{var c=localStorage.getItem("${THEME_KEY}");var t=c==="light"||c==="dark"?c:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
