# Read the _quarto.yml file
yaml <- readLines("_quarto.yml")

# Format the current date
today <- format(Sys.Date(), "%d/%m/%Y")

# Replace the date field
yaml <- gsub("date: \".*\"", paste0("date: \"", today, "\""), yaml)

# Write the updated file back
writeLines(yaml, "_quarto.yml")
