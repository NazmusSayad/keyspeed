FRONTEND_DIR = .
TAURI_DIR = src-tauri

ifeq ($(OS),Windows_NT)
$(info Windows detected, setting CMake build flags...)
export CMAKE_C_FLAGS_RELEASE ?= /O2 /Ob2 /DNDEBUG /MD /nologo /Brepro /W0
export CMAKE_CXX_FLAGS_RELEASE ?= /O2 /Ob2 /DNDEBUG /MD /nologo /Brepro /W0 /utf-8
endif

install:
	pnpm install
	cd $(TAURI_DIR) && cargo fetch

dev:
	pnpm tauri dev

build:
	pnpm tauri build

ts-check:
	pnpm exec tsc --noEmit && pnpm lint:fix

cargo-check:
	cd $(TAURI_DIR) && cargo check && cargo clippy -- -D warnings

cargo-test:
	cd $(TAURI_DIR) && cargo test

clean:
	rm -rf dist
	rm -rf $(TAURI_DIR)/target

rebuild:
	rm -rf dist
	rm -rf $(TAURI_DIR)/target
	pnpm tauri build

build-win-win:
	pnpm tauri build --target x86_64-pc-windows-msvc --bundles msi,nsis

build-linux-win:
	pnpm tauri build --target x86_64-unknown-linux-gnu --bundles appimage,deb,rpm

icon:
	pnpm tauri icon ./public/tauri.svg
