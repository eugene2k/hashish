WEBEXT_NAME=hashish.xpi
TARGET_TRIPLE=wasm32-unknown-unknown
TARGET_DIR=target
BUILD_TYPE=release
CARGO_OUT_DIR=$(TARGET_DIR)/$(TARGET_TRIPLE)/$(BUILD_TYPE)
package:
	cargo build --$(BUILD_TYPE) --target $(TARGET_TRIPLE)
	wasm-snip --snip-rust-panicking-code --snip-rust-fmt-code -o $(CARGO_OUT_DIR)/hashish-snip.wasm $(CARGO_OUT_DIR)/hashish_rs.wasm
	wasm-opt --strip-debug -O3 -o $(CARGO_OUT_DIR)/hashish.wasm $(CARGO_OUT_DIR)/hashish-snip.wasm
	cd webext; zip $(PWD)/$(WEBEXT_NAME) *
	cd $(CARGO_OUT_DIR); zip $(PWD)/$(WEBEXT_NAME) hashish.wasm
clean:
	cargo clean
	