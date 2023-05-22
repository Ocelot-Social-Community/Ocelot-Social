"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("./server"));
const config_1 = __importDefault(require("./config"));
const { server, httpServer } = (0, server_1.default)();
const url = new URL(config_1.default.GRAPHQL_URI);
httpServer.listen({ port: url.port }, () => {
    /* eslint-disable-next-line no-console */
    console.log(`🚀 Server ready at http://localhost:${url.port}${server.graphqlPath}`);
    /* eslint-disable-next-line no-console */
    console.log(`🚀 Subscriptions ready at ws://localhost:${url.port}${server.subscriptionsPath}`);
});
