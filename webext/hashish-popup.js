window.addEventListener("load", function (event) {
    browser.runtime.sendMessage({ type: "get_host" }).then(
        function (response) {
            document.getElementById("input-salt").value = response.message;
        },
        function (error) {
            console.log(error);
        }
    );

    let generate_button = document.getElementById("generate");
    let input_key = document.getElementById("input-key");
    let use_special_chars = document.getElementById("use-special-chars");

    generate_button.addEventListener("click", function (event) {
        let hash = document.getElementById("hash");
        if (hash == null) {
            let body = document.body;
            hash = document.createElement("div");
            hash.id = "hash";
            body.appendChild(hash);
        }
        let input_salt = document.getElementById("input-salt");
        browser.runtime.sendMessage({
            type: "generate_password",
            key: input_key.value,
            salt: input_salt.value,
            use_special_chars: use_special_chars.checked
        }).then(
            function (response) {
                hash.innerText = response.message;
            },
            function (error) {
                console.log(error);
            }
        );
    })

    input_key.addEventListener("input", function (event) {
        if (event.target.value.length > 0) {
            generate_button.disabled = false;
        } else {
            generate_button.disabled = true;
        }
    })
});
