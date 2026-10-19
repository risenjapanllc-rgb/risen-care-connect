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

        const emailLabel =
            emailInput.closest("label");

        const passwordLabel =
            passwordInput.closest("label");

        if (emailLabel) {
            emailLabel.hidden =
                true;
        }

        if (passwordLabel) {
            passwordLabel.hidden =
                true;
        }

        loginButton.hidden =
            true;

        setLoginStatus(
            "Semantic管理者としてログイン中"
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

        const pendingCandidates =
            body.candidates.filter(
                candidate =>
                    candidate.status ===
                        "submitted"
            );

        const acceptedCandidates =
            body.candidates.filter(
                candidate =>
                    candidate.status ===
                        "accepted"
            );

        const otherCandidates =
            body.candidates.filter(
                candidate =>
                    candidate.status !==
                        "submitted" &&
                    candidate.status !==
                        "accepted"
            );

        const pendingHeader =
            document.createElement(
                "div"
            );

        pendingHeader.className =
            "review-queue-header";

        const pendingTitle =
            document.createElement(
                "h3"
            );

        pendingTitle.textContent =
            `審査待ち ${pendingCandidates.length}件`;

        pendingHeader.append(
            pendingTitle
        );

        candidateList.append(
            pendingHeader
        );

        if (
            pendingCandidates.length === 0
        ) {
            const empty =
                document.createElement(
                    "p"
                );

            empty.className =
                "review-empty";

            empty.textContent =
                "現在、審査待ちのMeaningはありません。";

            candidateList.append(
                empty
            );
        } else {
            for (
                const candidate
                of pendingCandidates
            ) {
                candidateList.appendChild(
                    createCandidateCard(
                        candidate
                    )
                );
            }
        }

        const acceptedDetails =
            document.createElement(
                "details"
            );

        acceptedDetails.className =
            "accepted-history";

        const acceptedSummary =
            document.createElement(
                "summary"
            );

        acceptedSummary.textContent =
            `承認済み履歴 ${acceptedCandidates.length}件`;

        acceptedDetails.append(
            acceptedSummary
        );

        const acceptedList =
            document.createElement(
                "div"
            );

        for (
            const candidate
            of acceptedCandidates
        ) {
            acceptedList.appendChild(
                createCandidateCard(
                    candidate
                )
            );
        }

        acceptedDetails.append(
            acceptedList
        );

        candidateList.append(
            acceptedDetails
        );

        if (
            otherCandidates.length > 0
        ) {
            const otherDetails =
                document.createElement(
                    "details"
                );

            const otherSummary =
                document.createElement(
                    "summary"
                );

            otherSummary.textContent =
                `その他 ${otherCandidates.length}件`;

            otherDetails.append(
                otherSummary
            );

            for (
                const candidate
                of otherCandidates
            ) {
                otherDetails.appendChild(
                    createCandidateCard(
                        candidate
                    )
                );
            }

            candidateList.append(
                otherDetails
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
            candidate.status === "submitted"
                ? "審査待ち"
                : candidate.status === "accepted"
                    ? "承認済み"
                    : `状態: ${candidate.status}`;

        status.className =
            candidate.status === "submitted"
                ? "status-badge status-pending"
                : candidate.status === "accepted"
                    ? "status-badge status-accepted"
                    : "status-badge status-other";

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

        const proposalStatus =
            document.createElement(
                "div"
            );

        proposalStatus.className =
            "meaning-review-note";

        proposalStatus.textContent =
            "AIがMeaning候補を整理しています...";

        async function loadAiProposal() {
            try {
                const response =
                    await fetch(
                        `/api/admin/standard-meaning-candidates/${encodeURIComponent(candidate.candidateId)}/proposal`,
                        {
                            method:
                                "POST",
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
                    !body?.proposal
                ) {
                    proposalStatus.textContent =
                        `AI提案を取得できません: ${
                            body?.errorCode ||
                            "unknown"
                        }`;

                    return;
                }

                const proposal =
                    body.proposal;

                const mode =
                    String(
                        proposal.mode || ""
                    ).trim();

                const reason =
                    String(
                        proposal.reason || ""
                    ).trim();

                const confidence =
                    String(
                        proposal.confidence || ""
                    ).trim();

                if (
                    typeof proposal.semanticType ===
                        "string"
                ) {
                    semanticType.input.value =
                        proposal.semanticType;
                }

                if (
                    mode === "existing" ||
                    mode === "new"
                ) {
                    entity.input.value =
                        proposal.entityName || "";

                    field.input.value =
                        proposal.fieldName || "";

                    display.input.value =
                        proposal.displayName || "";

                    synonyms.input.value =
                        Array.isArray(
                            proposal.synonyms
                        )
                            ? proposal.synonyms.join(",")
                            : "";

                    const confidenceLabel =
                        confidence === "high"
                            ? "高"
                            : confidence === "medium"
                                ? "中"
                                : "低";

                    const decisionLabel =
                        mode === "existing"
                            ? "既存Meaningを利用"
                            : "新しいMeaningを提案";

                    const displayName =
                        String(
                            proposal.displayName || ""
                        ).trim();

                    proposalStatus.textContent =
                        [
                            `AI判断：${decisionLabel}`,
                            displayName
                                ? `Meaning候補：${displayName}`
                                : "",
                            `信頼度：${confidenceLabel}`,
                            reason
                                ? `判断理由：${reason}`
                                : ""
                        ]
                            .filter(Boolean)
                            .join("\n");

                    proposalStatus.style.whiteSpace =
                        "pre-line";

                    return;
                }

                proposalStatus.textContent =
                    `AI判断：保留${
                        reason
                            ? `\n判断理由：${reason}`
                            : ""
                    }`;

                proposalStatus.style.whiteSpace =
                    "pre-line";
            } catch {
                proposalStatus.textContent =
                    "AI提案を取得できません";
            }
        }

        const button =
            document.createElement(
                "button"
            );

        button.textContent =
            "Meaningを承認";

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

        const technicalDetails =
            document.createElement(
                "details"
            );

        const technicalSummary =
            document.createElement(
                "summary"
            );

        technicalSummary.textContent =
            "技術情報を確認・調整";

        technicalDetails.append(
            technicalSummary,
            entity.label,
            field.label,
            display.label,
            synonyms.label,
            semanticType.label
        );

        article.append(
            proposalStatus,
            technicalDetails,
            button,
            result
        );

        void loadAiProposal();

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
