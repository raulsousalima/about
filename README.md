# Antigravity Design System Site

Este projeto é um site moderno construído com **Vite**, **Tailwind CSS** e um sistema de **Design Tokens** baseado em variáveis CSS.

## 🚀 Como subir no GitHub e Vercel

### 1. GitHub
1. Crie um novo repositório no GitHub.
2. Inicie o git localmente:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

### 2. Vercel
1. Vá para [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
2. Clique em **"Add New"** > **"Project"**.
3. Importe o repositório que você acabou de criar.
4. A Vercel detectará automaticamente que é um projeto Vite. 
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Clique em **Deploy**.

## 🎨 Como alterar o Design System

Este projeto utiliza variáveis CSS para centralizar os padrões visuais. Para alterar as cores, fontes ou arredondamentos, basta editar o arquivo `src/index.css`:

```css
:root {
  /* Altere estas variáveis para mudar o visual de todo o site */
  --color-primary: #6366f1; /* Cor principal */
  --color-secondary: #0f172a; /* Cor secundária */
  --color-accent: #f43f5e; /* Cor de destaque */
  --radius-brand: 1rem; /* Arredondamento dos botões e cards */
}
```

As classes do Tailwind já estão mapeadas para estas variáveis como `bg-brand-primary`, `text-brand-accent`, etc.

## 🛠️ Desenvolvimento Local

```bash
npm install
npm run dev
```
