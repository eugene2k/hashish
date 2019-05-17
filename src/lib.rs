#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

static mut ERROR: i8 = -1;

fn convert(bytes: &[u8], use_special_chars: bool) -> Vec<u8> {
    use convert_base::Convert;
    let range = if use_special_chars { 94 } else { 62 };
    let mut converter = Convert::new(256, range);
    let out = converter.convert::<u8, u8>(&bytes.to_vec());
    if use_special_chars {
        out.iter().map(|byte| byte + 33).collect()
    } else {
        out.iter()
            .map(|&byte| {
                if byte < 10 {
                    byte + 48
                } else if byte < 36 {
                    byte + 65 - 10
                } else {
                    byte + 97 - 36
                }
            })
            .collect()
    }
}

#[no_mangle]
pub unsafe fn generate_password(salt: *mut i8, key: *mut i8, use_special_chars: bool) -> *mut i8 {
    use std::ffi::{CStr, CString};
    let config = argon2::Config::default();
    let key = CStr::from_ptr(key);
    let salt = CStr::from_ptr(salt);
    let result = argon2::hash_raw(key.to_bytes(), salt.to_bytes(), &config);
    match result {
        Ok(hash) => {
            let password = hash;
            ERROR = -1;
            CString::from_vec_unchecked(convert(&password, use_special_chars)).into_raw()
        }
        Err(error) => {
            ERROR = error as i8;
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe fn get_error() -> i8 {
    ERROR
}

#[no_mangle]
pub unsafe fn dealloc_bytes(ptr: *mut u8, size: u32) {
    use std::alloc::{dealloc, Layout};
    let layout = Layout::from_size_align_unchecked(size as usize, 1);
    dealloc(ptr, layout);
}

#[no_mangle]
pub unsafe fn alloc_bytes(size: u32) -> *mut u8 {
    use std::alloc::{alloc_zeroed, Layout};
    let layout = Layout::from_size_align_unchecked(size as usize, 1);
    alloc_zeroed(layout)
}

#[no_mangle]
pub unsafe fn cstring_len(ptr: *mut i8) -> u32 {
    std::ffi::CStr::from_ptr(ptr).to_bytes().len() as u32
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_cstr() {
        unsafe {
            let bstr = b"Hello World";
            let s = alloc_bytes(1 + bstr.len() as u32);
            for (index, byte) in bstr.iter().enumerate() {
                *s.add(index) = *byte;
            }
            assert_eq!(cstring_len(s as *mut i8), bstr.len() as u32);
            dealloc_bytes(s, 1 + bstr.len() as u32);
        }
    }

    #[test]
    fn test_generate_password() {
        let salt: &[u8] = b"www.reddit.com";
        let key: &[u8] = b"hj";
        let salt_cstring = std::ffi::CString::new(salt).unwrap();
        let key_cstring = std::ffi::CString::new(key).unwrap();
        let pw_cstring = unsafe {
            generate_password(
                salt_cstring.as_ptr() as *mut _,
                key_cstring.as_ptr() as *mut _,
                false,
            )
        };
        unsafe {
            dealloc_bytes(pw_cstring as *mut u8, cstring_len(pw_cstring));
        }
    }
}
