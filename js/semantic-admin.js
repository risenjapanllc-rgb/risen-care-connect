"use strict";

(() => {
    let accessToken = "";

    const emailInput =
        document.getElementById(
            "admin-email"
        );

    const passwordInput =
        document.getElementById(
            "admin-password"
        );

    const loginButton =
        document.getElementById(
            "admin-login-button"
        );

    const loginStatus =
        document.getElementById(
            "login-status"
        );

    const candidateSection =
        document.getElementById(
            "candidate-section"
        );

    const candidateList =
        document.getElementById(
            "candidate-list"
        );

    const reloadButton =
        document.getElementById(
            "reload-candidates-button"
        );


    function setLoginStatus(message) {
        loginStatus.textContent =
            String(message || "");
    }


    async function login() {
        setLoginStatus(
            "ログイン中..."
        );

        const response =
            await fetch(
                "/api/admin/session",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            email:
                                emailInput.value,
                            password:
                                passwordInput.value
                        })
                }
            );

        const body =
            await response.json();

        if (
            !response.ok ||
            typeof body?.accessToken !==
                "string"
        ) {
            accessToken = "";

            setLoginStatus(
                body?.errorCode ||
                "ログインに失敗しました"
            );

            return;
        }

        accessToken =
            body.accessToken;

        passwordInput.value = "";

        setLoginStatus(
            "ログインしました"
        );

        candidateSection.hidden =
            false;

        await loadCandidates();
    }


    async function loadCandidates() {
        if (!accessToken) {
            return;
        }

        candidateList.textContent =
            "読込中...";

        const response =
            await fetch(
                "/api/admin/standard-meaning-candidates",
                {
                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );

        const body =
            await response.json();

        if (
            !response.ok ||
            !Array.isArray(body?.candidates)
        ) {
            candidateList.textContent =
                body?.errorCode ||
                "候補の取得に失敗しました";

            return;
        }

        candidateList.replaceChildren();

        for (
            const candidate
            of body.candidates
        ) {
            candidateList.appendChild(
                createCandidateCard(
                    candidate
                )
            );
        }
    }


    function createInput(
        labelText,
        value = ""
    ) {
        const label =
            document.createElement(
                "label"
            );

        const title =
            document.createElement(
                "span"
            );

        title.textContent =
            labelText;

        const input =
            document.createElement(
                "input"
            );

        input.value =
            value || "";

        label.append(
            title,
            input
        );

        return {
            label,
            input
        };
    }


    function createCandidateCard(
        candidate
    ) {
        const article =
            document.createElement(
                "article"
            );

        const heading =
            document.createElement(
                "h3"
            );

        heading.textContent =
            candidate.proposedMeaning ||
            candidate.templateFieldKey ||
            candidate.candidateId;

        const status =
            document.createElement(
                "p"
            );

        status.textContent =
            `status: ${candidate.status}`;

        article.append(
            heading,
            status
        );

        if (
            candidate.status !==
                "submitted"
        ) {
            return article;
        }

        const entity =
            createInput(
                "entityName"
            );

        const field =
            createInput(
                "fieldName"
            );

        const display =
            createInput(
                "displayName",
                candidate.proposedMeaning
            );

        const synonyms =
            createInput(
                "synonyms（カンマ区切り）",
                candidate.proposedMeaning
            );

        const semanticType =
            createInput(
                "semanticType"
            );

        const button =
            document.createElement(
                "button"
            );

        button.textContent =
            "正式Meaningとして承認";

        const result =
            document.createElement(
                "p"
            );

        button.addEventListener(
            "click",
            async () => {
                button.disabled =
                    true;

                result.textContent =
                    "承認中...";

                try {
                    const response =
                        await fetch(
                            `/api/admin/standard-meaning-candidates/${encodeURIComponent(candidate.candidateId)}/accept`,
                            {
                                method:
                                    "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json",
                                    Authorization:
                                        `Bearer ${accessToken}`
                                },
                                body:
                                    JSON.stringify({
                                        entityName:
                                            entity.input.value,
                                        fieldName:
                                            field.input.value,
                                        displayName:
                                            display.input.value,
                                        synonyms:
                                            synonyms.input.value
                                                .split(",")
                                                .map(
                                                    value =>
                                                        value.trim()
                                                )
                                                .filter(Boolean),
                                        semanticType:
                                            semanticType.input.value
                                    })
                            }
                        );

                    const body =
                        await response.json();

                    if (!response.ok) {
                        result.textContent =
                            body?.errorCode ||
                            "承認に失敗しました";

                        return;
                    }

                    result.textContent =
                        `${body.status} / ${body.meaningId || "-"}`;

                    await loadCandidates();
                } finally {
                    button.disabled =
                        false;
                }
            }
        );

        article.append(
            entity.label,
            field.label,
            display.label,
            synonyms.label,
            semanticType.label,
            button,
            result
        );

        return article;
    }


    loginButton.addEventListener(
        "click",
        () => {
            login().catch(error => {
                console.error(error);

                setLoginStatus(
                    "ログイン処理でエラーが発生しました"
                );
            });
        }
    );


    reloadButton.addEventListener(
        "click",
        () => {
            loadCandidates().catch(
                console.error
            );
        }
    );
})();
