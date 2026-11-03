import test from "node:test";
import assert from "node:assert/strict";
import { deviceSettingsError, deviceSettingsSuccess } from "./deviceSettings.js";

test("DB 저장과 기기 전송 여부를 포함한 서버 응답을 유지한다", () => {
    const message = "2시간 촬영 주기 DB 저장 완료 · MQTT 꺼짐으로 기기 전송 안 됨";
    assert.equal(deviceSettingsSuccess({ data: message }, "저장됨"), message);
    assert.equal(deviceSettingsSuccess({ data: {} }, "저장됨"), "저장됨");
});

test("MQTT 전송 실패와 서버 오류 본문의 원인을 표시한다", () => {
    const message = "MQTT 브로커에 촬영 주기 명령을 보낼 수 없습니다.";
    assert.equal(deviceSettingsError({ response: { status: 503, data: message } }, "실패"), message);
    assert.equal(deviceSettingsError({ response: { status: 400, data: { message: "촬영 주기는 필수입니다." } } }), "촬영 주기는 필수입니다.");
    assert.equal(deviceSettingsError({ response: { data: { detail: "잘못된 입력" } } }), "잘못된 입력");
});

test("인증과 연결 실패를 구분하고 HTML 오류 페이지를 그대로 표시하지 않는다", () => {
    assert.match(deviceSettingsError({ response: { status: 401, data: "Unauthorized" } }), /로그인/);
    assert.match(deviceSettingsError({ response: { status: 403 } }), /권한/);
    assert.match(deviceSettingsError({ request: {} }), /백엔드에 연결/);
    assert.equal(deviceSettingsError({ response: { data: "<html>Bad gateway</html>" } }, "저장 실패"), "저장 실패");
    assert.equal(deviceSettingsError({}, "저장 실패"), "저장 실패");
});
