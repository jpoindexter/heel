//! The shell's small JSON files (settings, panel size and place, the hidden flag) are written whole or not at all.
//! `fs::write` truncates first; a crash or power cut between the truncate and the write left an empty file, which
//! every reader takes as "use the default", so a setting went back silently.

use std::path::Path;

pub(crate) fn write(path: &Path, contents: &str) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let staging = path.with_extension("tmp");
    std::fs::write(&staging, contents)?;
    std::fs::rename(staging, path)
}

#[cfg(test)]
mod tests {
    #[test]
    fn writes_the_file_whole_creates_the_folder_and_leaves_no_staging_file() {
        let dir = std::env::temp_dir().join(format!("heel-save-file-{}", std::process::id()));
        let path = dir.join("deep").join("x.json");
        super::write(&path, r#"{"a":1}"#).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), r#"{"a":1}"#);
        super::write(&path, r#"{"a":2}"#).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), r#"{"a":2}"#, "replaces an existing file");
        assert!(!path.with_extension("tmp").exists());
        let _ = std::fs::remove_dir_all(dir);
    }
}
