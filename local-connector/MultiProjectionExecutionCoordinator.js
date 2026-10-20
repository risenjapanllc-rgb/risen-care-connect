"use strict";

class MultiProjectionExecutionCoordinator {
    constructor({
        executors
    } = {}) {
        if (
            !executors ||
            typeof executors !== "object" ||
            Array.isArray(executors)
        ) {
            throw new Error(
                "MultiProjectionExecutionCoordinator requires executors"
            );
        }

        this.executors = executors;
    }

    async execute({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        projections
    } = {}) {
        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0 ||
            !Array.isArray(projections) ||
            projections.length === 0
        ) {
            return {
                status: "invalid",
                projections: []
            };
        }

        const normalizedProjections =
            projections.map(projection => ({
                semanticType:
                    typeof projection?.semanticType === "string"
                        ? projection.semanticType.trim()
                        : "",
                expectedFingerprint:
                    typeof projection?.expectedFingerprint === "string"
                        ? projection.expectedFingerprint.trim()
                        : ""
            }));

        const semanticTypes =
            normalizedProjections.map(
                projection =>
                    projection.semanticType
            );

        if (
            normalizedProjections.some(
                projection =>
                    !projection.semanticType ||
                    !/^[0-9a-f]{64}$/.test(
                        projection.expectedFingerprint
                    )
            ) ||
            new Set(semanticTypes).size !==
                semanticTypes.length
        ) {
            return {
                status: "invalid",
                projections:
                    normalizedProjections.map(
                        projection => ({
                            semanticType:
                                projection.semanticType || null,
                            status: "not_started"
                        })
                    )
            };
        }

        const unsupportedIndex =
            normalizedProjections.findIndex(
                projection => {
                    const executor =
                        this.executors[
                            projection.semanticType
                        ];

                    return (
                        !executor ||
                        typeof executor.execute !==
                            "function"
                    );
                }
            );

        if (unsupportedIndex !== -1) {
            return {
                status: "unsupported",
                projections:
                    normalizedProjections.map(
                        (projection, index) => ({
                            semanticType:
                                projection.semanticType,
                            status:
                                index === unsupportedIndex
                                    ? "unsupported"
                                    : "not_started"
                        })
                    )
            };
        }

        const results = [];
        let stopped = false;

        for (const projection of normalizedProjections) {
            const semanticType =
                projection.semanticType;

            const expectedFingerprint =
                projection.expectedFingerprint;

            if (stopped) {
                results.push({
                    semanticType: semanticType || null,
                    status: "not_started"
                });
                continue;
            }

            const executor =
                this.executors[semanticType];

            if (
                !executor ||
                typeof executor.execute !== "function"
            ) {
                results.push({
                    semanticType,
                    status: "unsupported"
                });

                stopped = true;
                continue;
            }

            let result;

            try {
                result =
                    await executor.execute({
                        sourceDocumentKey:
                            sourceDocumentKey.trim(),
                        sourceUpdatedAt:
                            sourceUpdatedAt.trim(),
                        sourceSize,
                        expectedFingerprint
                    });
            } catch {
                result = {
                    status: "error"
                };
            }

            const status =
                result &&
                typeof result.status === "string" &&
                result.status.trim()
                    ? result.status.trim()
                    : "error";

            results.push({
                semanticType,
                ...result,
                status
            });

            if (status !== "completed") {
                stopped = true;
            }
        }

        const completedCount =
            results.filter(
                item =>
                    item.status === "completed"
            ).length;

        const allCompleted =
            completedCount === projections.length;

        return {
            status:
                allCompleted
                    ? "completed"
                    : completedCount > 0
                        ? "partially_completed"
                        : (
                            results[0]?.status ||
                            "blocked"
                        ),
            projections: results
        };
    }
}

module.exports =
    MultiProjectionExecutionCoordinator;
