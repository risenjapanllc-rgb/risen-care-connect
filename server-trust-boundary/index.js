"use strict";

/**
 * RISEN CARE Server Trust Boundary Module
 *
 * Exports the core classes for Server Trust Boundary implementation.
 */

const ServerTrustBoundaryService =
    require("./ServerTrustBoundaryService");

const ResidentRepository =
    require("./ResidentRepository");

module.exports = {
    ServerTrustBoundaryService,
    ResidentRepository
};
