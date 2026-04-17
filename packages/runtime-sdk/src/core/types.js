export class SdkError extends Error {
    code;
    detail;
    constructor(code, message, detail) {
        super(message);
        this.name = "SdkError";
        this.code = code;
        this.detail = detail;
    }
}
//# sourceMappingURL=types.js.map