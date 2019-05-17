let hostname;
let generatePassword;
browser.tabs.onUpdated.addListener(async function (tabId, changeInfo, tabInfo) {
    let tab = await browser.tabs.get(tabId);

    //find & remove protocol (http, ftp, etc.) and get hostname
    if (tab.url.indexOf("//") > -1) {
        hostname = tab.url.split('/')[2];
    }
    else {
        hostname = tab.url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];
});

browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.type) {
        case "get_host": sendResponse({ message: hostname }); break;
        case "generate_password": {
            password = generatePassword(message.salt, message.key, message.use_special_chars);
            sendResponse({ message: password });
            break;
        }
    }
});

async function loadHasherModule() {
    let { instance } = await fetch('hasher.wasm')
        .then(response => response.arrayBuffer())
        .then(bytes => WebAssembly.instantiate(bytes));
    let wasm = instance.exports;

    function str2cstr(str) {
        let buffer = wasm.alloc_bytes(str.length + 1);
        let buffer_view = new Uint8Array(wasm.memory.buffer, buffer, str.length);
        let encoder = new TextEncoder();
        encoder.encodeInto(str, buffer_view);
        return buffer;
    };

    function cstr2str(cstr_ptr) {
        let cstr_len = wasm.cstring_len(cstr_ptr);
        let buffer_view = new Uint8Array(wasm.memory.buffer, cstr_ptr, cstr_len);
        let decoder = new TextDecoder();
        let str = decoder.decode(buffer_view);
        wasm.dealloc_bytes(cstr_ptr, cstr_len);
        return str;
    };

    generatePassword = function (salt, key, use_special_chars) {
        let key_cstr = str2cstr(key);
        let salt_cstr = str2cstr(salt);
        let pw_cstr = wasm.generate_password(salt_cstr, key_cstr, use_special_chars);
        wasm.dealloc_bytes(key_cstr, key.length);
        wasm.dealloc_bytes(key_cstr, key.length);
        return cstr2str(pw_cstr);
    };
}
loadHasherModule();