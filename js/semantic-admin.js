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

        const loginSection =
            document.getElementById(
                "login-section"
            );

        loginSection
            ?.classList
            .add(
                "is-authenticated"
            );

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

        article.dataset.templateFieldKey =
            String(
                candidate.templateFieldKey ||
                ""
            ).trim();

        article.dataset.candidateId =
            String(
                candidate.candidateId ||
                ""
            ).trim();

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

        const evidence =
            candidate.evidence &&
            typeof candidate.evidence === "object" &&
            !Array.isArray(
                candidate.evidence
            )
                ? candidate.evidence
                : {};

        const sourceLabel =
            String(
                evidence.sourceLabel ||
                candidate.templateFieldKey ||
                ""
            ).trim();

        const staffClarification =
            String(
                evidence.staffClarification ||
                ""
            ).trim();

        const sampleValues =
            Array.isArray(
                evidence.sampleValues
            )
                ? evidence.sampleValues
                    .map(value =>
                        String(
                            value ?? ""
                        ).trim()
                    )
                    .filter(Boolean)
                    .slice(0, 5)
                : [];

        const neighboringFields =
            Array.isArray(
                evidence.neighboringFields
            )
                ? evidence.neighboringFields
                    .map(value =>
                        String(
                            value ?? ""
                        ).trim()
                    )
                    .filter(Boolean)
                    .slice(0, 10)
                : [];

        const evidencePanel =
            document.createElement(
                "div"
            );

        evidencePanel.className =
            "review-evidence-panel";

        const evidenceTitle =
            document.createElement(
                "div"
            );

        evidenceTitle.className =
            "review-evidence-title";

        evidenceTitle.textContent =
            "審査Evidence";

        evidencePanel.append(
            evidenceTitle
        );

        function appendEvidenceRow(
            labelText,
            valueText,
            emphasis = false
        ) {
            if (!valueText) {
                return;
            }

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                emphasis
                    ? "review-evidence-row review-evidence-important"
                    : "review-evidence-row";

            const label =
                document.createElement(
                    "span"
                );

            label.className =
                "review-evidence-label";

            label.textContent =
                labelText;

            const value =
                document.createElement(
                    "div"
                );

            value.className =
                "review-evidence-value";

            value.textContent =
                valueText;

            row.append(
                label,
                value
            );

            evidencePanel.append(
                row
            );
        }

        appendEvidenceRow(
            "施設からの補足",
            staffClarification,
            true
        );

        appendEvidenceRow(
            "原本項目",
            sourceLabel
        );

        appendEvidenceRow(
            "原本の値",
            sampleValues.join(" / ")
        );

        appendEvidenceRow(
            "周辺項目",
            neighboringFields.join(" / ")
        );

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

        const adminInterpretationPanel =
            document.createElement(
                "div"
            );

        adminInterpretationPanel.className =
            "admin-interpretation-panel";

        const adminInterpretationTitle =
            document.createElement(
                "div"
            );

        adminInterpretationTitle.className =
            "admin-interpretation-title";

        adminInterpretationTitle.textContent =
            "管理者側で意味を補正";

        const adminInterpretationHelp =
            document.createElement(
                "p"
            );

        adminInterpretationHelp.className =
            "admin-interpretation-help";

        adminInterpretationHelp.textContent =
            "施設の回答は変更せず、管理者側の解釈を別Evidenceとして保存してAIに再判定させます。";

        const savedAdminInterpretation =
            String(
                evidence
                    .risenAdminInterpretation ||
                ""
            ).trim();

        const currentAdminInterpretation =
            document.createElement(
                "div"
            );

        currentAdminInterpretation.className =
            "admin-interpretation-current";

        currentAdminInterpretation.style.display =
            savedAdminInterpretation
                ? "block"
                : "none";

        const currentAdminInterpretationLabel =
            document.createElement(
                "div"
            );

        currentAdminInterpretationLabel.textContent =
            "現在の管理者補足";

        currentAdminInterpretationLabel.style.fontWeight =
            "700";

        const currentAdminInterpretationText =
            document.createElement(
                "div"
            );

        currentAdminInterpretationText.className =
            "admin-interpretation-current-text";

        currentAdminInterpretationText.textContent =
            savedAdminInterpretation;

        currentAdminInterpretation.append(
            currentAdminInterpretationLabel,
            currentAdminInterpretationText
        );

        const adminInterpretationInput =
            document.createElement(
                "textarea"
            );

        adminInterpretationInput.className =
            "admin-interpretation-input";

        adminInterpretationInput.rows =
            3;

        adminInterpretationInput.placeholder =
            "例：名称だけでなく番号が入る場合もある";

        adminInterpretationInput.value =
            "";

        const adminReevaluateButton =
            document.createElement(
                "button"
            );

        adminReevaluateButton.type =
            "button";

        adminReevaluateButton.className =
            "secondary-button";

        adminReevaluateButton.textContent =
            "AI再判定";

        const adminInterpretationStatus =
            document.createElement(
                "p"
            );

        adminInterpretationStatus.className =
            "admin-interpretation-status";

        adminInterpretationPanel.append(
            adminInterpretationTitle,
            adminInterpretationHelp,
            currentAdminInterpretation,
            adminInterpretationInput,
            adminReevaluateButton,
            adminInterpretationStatus
        );

        async function loadAiProposal({
            adminInterpretation = ""
        } = {}) {
            try {
                const response =
                    await fetch(
                        `/api/admin/standard-meaning-candidates/${encodeURIComponent(candidate.candidateId)}/proposal`,
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
                                    adminInterpretation
                                })
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

                if (
                    String(
                        adminInterpretation ||
                        ""
                    ).trim()
                ) {
                    evidence.risenAdminInterpretation =
                        String(
                            adminInterpretation
                        ).trim();

                    currentAdminInterpretationText
                        .textContent =
                        evidence.risenAdminInterpretation;

                    currentAdminInterpretation
                        .style.display =
                        "block";

                    adminInterpretationInput.value =
                        "";

                    adminInterpretationStatus
                        .textContent =
                        "意味補正を保存し、AIで再判定しました。";
                }

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

                const facilityQuestion =
                    String(
                        proposal.facilityQuestion || ""
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
                    button.disabled =
                        false;

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

                button.disabled =
                    true;

                proposalStatus.textContent =
                    [
                        "AI判断：保留",
                        reason
                            ? `判断理由：${reason}`
                            : "",
                        facilityQuestion
                            ? `施設への確認事項：${facilityQuestion}`
                            : ""
                    ]
                        .filter(Boolean)
                        .join("\n");

                proposalStatus.style.whiteSpace =
                    "pre-line";
            } catch {
                button.disabled =
                    true;

                proposalStatus.textContent =
                    "AI提案を取得できません";
            }
        }

        adminReevaluateButton
            .addEventListener(
                "click",
                async () => {
                    const interpretation =
                        String(
                            adminInterpretationInput
                                .value ||
                            ""
                        ).trim();

                    if (!interpretation) {
                        adminInterpretationStatus
                            .textContent =
                            "管理者側の意味補正を入力してください。";

                        adminInterpretationInput
                            .focus();

                        return;
                    }

                    adminReevaluateButton
                        .disabled =
                        true;

                    adminReevaluateButton
                        .textContent =
                        "再判定中...";

                    adminInterpretationStatus
                        .textContent =
                        "";

                    try {
                        await loadAiProposal({
                            adminInterpretation:
                                interpretation
                        });
                    } finally {
                        adminReevaluateButton
                            .disabled =
                            false;

                        adminReevaluateButton
                            .textContent =
                            "AI再判定";
                    }
                }
            );

        const button =
            document.createElement(
                "button"
            );

        button.textContent =
            "Meaningを承認";

        button.disabled =
            true;

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

                    if (
                        window.parent &&
                        window.parent !== window
                    ) {
                        window.parent.postMessage(
                            {
                                type:
                                    "risen-semantic-authority-accepted",
                                sourceFieldKey:
                                    String(
                                        candidate
                                            .templateFieldKey ||
                                        ""
                                    ).trim(),
                                candidateId:
                                    String(
                                        candidate
                                            .candidateId ||
                                        ""
                                    ).trim(),
                                meaningId:
                                    String(
                                        body.meaningId ||
                                        ""
                                    ).trim()
                            },
                            window.location.origin
                        );
                    }

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
            evidencePanel,
            proposalStatus,
            adminInterpretationPanel,
            technicalDetails,
            button,
            result
        );

        void loadAiProposal();

        return article;
    }


    window.addEventListener(
        "message",
        event => {
            if (
                event.origin !==
                    window.location.origin
            ) {
                return;
            }

            if (
                event.data?.type !==
                    "risen-semantic-focus-candidate"
            ) {
                return;
            }

            const sourceFieldKey =
                String(
                    event.data
                        ?.sourceFieldKey ||
                    ""
                ).trim();

            if (!sourceFieldKey) {
                return;
            }

            const target =
                Array.from(
                    candidateList
                        .querySelectorAll(
                            "article[data-template-field-key]"
                        )
                )
                    .find(article =>
                        String(
                            article.dataset
                                .templateFieldKey ||
                            ""
                        ).trim() ===
                        sourceFieldKey
                    );

            if (!target) {
                return;
            }

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            target.classList.add(
                "workspace-focus-candidate"
            );

            window.setTimeout(
                () => {
                    target.classList.remove(
                        "workspace-focus-candidate"
                    );
                },
                2400
            );
        }
    );


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
