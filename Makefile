WASM_TARGET_DIR=target/wasm32-unknown-unknown/release
archive=$(PWD)/hasher.xpi

package:
	cargo build --target wasm32-unknown-unknown --release
	cd webext; zip $(archive) *
	cd $(WASM_TARGET_DIR); zip $(archive) hasher.wasm

clean:
	cargo clean
	