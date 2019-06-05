let hostname;
let generatePassword;

function setHostname(url) {
    //find & remove protocol (http, ftp, etc.) and get hostname
    if (url.indexOf("//") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
    browser.tabs.get(tabId).then(
        (tab) => {
            setHostname(tab.url);
        },
        (error) => {
            console.log(error);
        }
    );
});

browser.windows.onFocusChanged.addListener((windowId) => {
    browser.windows.getCurrent({ populate: true }).then(
        (window) => {
            for (let tab of window.tabs) {
                if (tab.active) {
                    setHostname(tab.url);
                    break;
                }
            }
        },
        (error) => console.log(error)
    );
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "get_host": sendResponse({ message: hostname }); break;
        case "generate_password": {
            password = generatePassword(message.salt, message.key, message.use_special_chars);
            sendResponse({ message: password });
            break;
        }
    }
});

fetch('hashish.wasm')
.then(response => response.arrayBuffer())
.then(bytes => WebAssembly.instantiate(bytes))
.then(instance => {
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
        let pw_cstr = wasm.generate_password(salt_cstr, key_cstr, 10, use_special_chars);
        wasm.dealloc_bytes(key_cstr, key.length);
        wasm.dealloc_bytes(salt_cstr, salt.length);
        return cstr2str(pw_cstr);
    };    
});
