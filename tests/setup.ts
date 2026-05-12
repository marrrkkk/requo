import "@testing-library/jest-dom";
import { applyTestEnv } from "./support/env";
import { installDomStubs } from "./support/dom-stubs";
import { installFetchGuard } from "./support/fetch-guard";

applyTestEnv();
installDomStubs();
installFetchGuard();
