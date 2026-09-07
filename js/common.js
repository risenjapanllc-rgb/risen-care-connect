// js/common.js

function getCurrentPage() {
    const path = window.location.pathname;

    if (path === "/" || path.endsWith("/index.html")) {
        return "home";
    }

    if (path.endsWith("/connection.html")) {
        return "connection";
    }

    if (path.endsWith("/table-mapping.html")) {
        return "table-mapping";
    }

    if (path.endsWith("/mapping.html")) {
        return "mapping";
    }

    if (path.endsWith("/validation.html")) {
        return "validation";
    }

    if (path.endsWith("/csv-poc.html")) {
        return "csv-poc";
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
            href: "/connection.html",
            label: "接続",
            pageName: "connection"
        },
        {
            href: "/table-mapping.html",
            label: "テーブル分類",
            pageName: "table-mapping"
        },
        {
            href: "/mapping.html",
            label: "カラム分類",
            pageName: "mapping"
        },
        {
            href: "/validation.html",
            label: "検証結果",
            pageName: "validation"
        },
        {
            href: "/csv-poc.html",
            label: "CSV取込PoC",
            pageName: "csv-poc"
        }
,
        {
            href: "/local-connector.html",
            label: "Word / Excel取込",
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