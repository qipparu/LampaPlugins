// Укажите своё имя пользователя и репозиторий
const GITHUB_USER = "qipparu";
const REPO_NAME = "test";
const BRANCH = "main"; // Или "master"

const scriptList = document.getElementById("script-list");

async function fetchJSFiles() {
  const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/git/trees/${BRANCH}?recursive=1`;

  try {
    const res = await fetch(apiUrl);
    const data = await res.json();

    const jsFiles = data.tree.filter(file => file.path.endsWith(".js") && !file.path.includes("script.js"));

    jsFiles.forEach(file => {
      const url = `https://${GITHUB_USER}.github.io/${REPO_NAME}/${file.path}`;
      const container = document.createElement("div");
      container.className = "bg-white p-4 rounded shadow flex justify-between items-center";

      const link = document.createElement("a");
      link.href = url;
      link.textContent = file.path;
      link.className = "text-blue-600 hover:underline break-all";

      const button = document.createElement("button");
      button.textContent = "📋 Копировать";
      button.className = "bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded";
      button.onclick = () => {
        navigator.clipboard.writeText(url);
        button.textContent = "✅ Скопировано!";
        setTimeout(() => button.textContent = "📋 Копировать", 2000);
      };

      container.append(link, button);
      scriptList.appendChild(container);
    });

  } catch (err) {
    scriptList.innerHTML = `<p class="text-red-600">Ошибка загрузки: ${err.message}</p>`;
  }
}

fetchJSFiles();
