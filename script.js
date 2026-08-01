function parseMarkdown(mdText) {
    const frontMatterRegex  = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;
    const match             = mdText.match(frontMatterRegex);

    if (!match) {return {metadata: {}, body: mdText};}

    const yamlBlock = match[1];
    const body      = match[2];
    const metadata  = {};

    yamlBlock.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {metadata[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '')}
    });

    return {metadata, body};
}

async function fetchAllArticles() {
    try {
        const apiUrl    = 'https://api.github.com/repos/DaviErnestPradipta/Personal-Site/contents/src/blog';
        const response  = await fetch(apiUrl);

        if (!response.ok) throw new Error('Failed to fetch blog directory listing');

        const files     = await response.json();
        const mdFiles   = files.filter(file => file.name.endsWith('.md'));

        const promises = mdFiles.map(async (file) => {
            const id    = file.name.replace(/\.md$/, '');
            const res   = await fetch(file.download_url);

            if (!res.ok) throw new Error(`Could not load ${file.name}`);

            const rawText          = await res.text();
            const {metadata, body} = parseMarkdown(rawText);

            return {
                id      : String(id),
                title   : metadata.title || 'Untitled',
                date    : metadata.date  || '',
                content : body
            };
        });

        const articles = await Promise.all(promises);
        return articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (err) {
        console.error("Error loading blog Markdown files:", err);
        return [];
    }
}

function truncateText(text, maxLength = 120) {
    if (!text) return '';
    const plainText = text.replace(/[*_#`~[\]]/g, '').trim();
    return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
}

async function renderBlogArticles() {
    const container = document.getElementById('blog-grid');
    if (!container) return;

    const articles      = await fetchAllArticles();
    const topArticles   = articles.slice(0, 4);

    container.innerHTML = topArticles.map(article => `<article class="blog-card">
        <div class="post-date">${article.date}</div>
        <h3>${article.title}</h3>
        <p>${truncateText(article.content, 120)}</p>
        <a href="blog.html?id=${article.id}">Read Article ▶</a>
    </article>`).join('');
}

async function initBlogReaderPage() {
    const blogList      = document.getElementById('blog-list');
    const contentDiv    = document.getElementById('article-details');

    if (!blogList || !contentDiv) return;

    const articles = await fetchAllArticles();

    if (articles.length === 0) {
        contentDiv.innerHTML = `<p style="color:red;">No Markdown articles found in <code>src/blog/</code>.</p>`;
        return;
    }

    blogList.innerHTML = articles.map(a => `<li data-id="${a.id}">${a.title}</li>`).join('');

    const displayArticle = (article) => {
        document.querySelectorAll('#blog-list li').forEach(li => {li.classList.toggle('active', parseInt(li.dataset.id) === article.id)});

        contentDiv.innerHTML = `
            <div class="article-date">${article.date}</div>
            <h1>${article.title}</h1>
            <div class="article-body">${marked.parse(article.content)}</div>
        `;
    };

    blogList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const id    = parseInt(e.target.dataset.id);
            const found = articles.find(a => a.id === id);

            if (found) displayArticle(found);
        }
    });

    const urlParams         = new URLSearchParams(window.location.search);
    const initialId         = parseInt(urlParams.get('id'));
    const initialArticle    = articles.find(a => a.id === initialId) || articles[0];
    
    if (initialArticle) displayArticle(initialArticle);
}

renderBlogArticles();
initBlogReaderPage();

const toggleBtn     = document.getElementById('theme-toggle');
const currentTheme  = localStorage.getItem('theme');

if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark' && toggleBtn) toggleBtn.textContent = '⬤';
}

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');

        if (theme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            toggleBtn.textContent = '⏾';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            toggleBtn.textContent = '⬤';
        }
    });
}