// js/common.js

function getCurrentPage() {
    const path = window.location.pathname;

    if (path === "/" || path.endsWith("/index.html")) {
        return "home";
    }

    if (path.endsWith("/local-connector.html")) {
        return "local-connector";
    }

    return "";
}

function createNavigationLink({
    href,
    label,
    pageName,
    currentPage
}) {
    const activeClass =
        pageName === currentPage
            ? "is-active"
            : "";

    const ariaCurrent =
        pageName === currentPage
            ? 'aria-current="page"'
            : "";

    return `
        <a
            href="${href}"
            class="app-navigation__link ${activeClass}"
            ${ariaCurrent}
        >
            ${label}
        </a>
    `;
}

function renderNavigation() {
    const navigationRoot =
        document.getElementById("main-navigation");

    if (!navigationRoot) {
        console.warn(
            "main-navigation が見つかりません。"
        );
        return;
    }

    const currentPage = getCurrentPage();

    const links = [
        {
            href: "/",
            label: "ホーム",
            pageName: "home"
        },
        {
            href: "/local-connector.html",
            label: "ファイル取込",
            pageName: "local-connector"
        }
    ];

    const navigationLinks = links
        .map(link =>
            createNavigationLink({
                ...link,
                currentPage
            })
        )
        .join("");

    navigationRoot.innerHTML = `
        <header class="app-header">
            <div class="app-header__inner">
                <a
                    href="/"
                    class="app-brand"
                >
                    <span class="app-brand__title">
                        RISEN CARE Connect
                    </span>

                    <span class="app-brand__subtitle">
                        AIKO Data Foundation
                    </span>
                </a>

                <nav
                    class="app-navigation"
                    aria-label="メインメニュー"
                >
                    ${navigationLinks}
                </nav>
            </div>
        </header>
    `;
}

document.addEventListener(
    "DOMContentLoaded",
    renderNavigation
);