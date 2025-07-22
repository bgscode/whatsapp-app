import readXlsxFile from "read-excel-file";
import papaparse from "papaparse-min";
import toast from "react-hot-toast";

const readCSVAndExcel = (file, requiredColumns = []) => {
  return new Promise((resolve, reject) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      papaparse.parse(file, {
        header: true,
        complete: (results) => {
          const header = results.meta.fields.map((f) => f.trim());
          if (requiredColumns.some((c) => !header.includes(c))) {
            toast.error(
              "CSV must have required columns: " + requiredColumns.join(", ")
            );
            return reject(
              new Error(
                "Missing required columns: " + requiredColumns.join(", ")
              )
            );
          }

          resolve({ headers: header, data: results.data });
        },
        error: (err) => {
          console.error("Error parsing CSV:", err);
          reject(err);
        },
      });
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      readXlsxFile(file, { sheet: 1 })
        .then((rows) => {
          if (!rows || rows.length === 0) {
            return reject(new Error("Empty Excel file."));
          }
          let [headers, ...dataRows] = rows;

          headers = headers.filter(Boolean).map((h) => h.trim());

          if (requiredColumns?.some((c) => !headers.includes(c))) {
            toast.error(
              "Excel must have required columns: " + requiredColumns.join(", ")
            );

            return reject(
              new Error(
                "Missing these " +
                  requiredColumns
                    .filter((r) => !headers.includes(r))
                    .join(", ") +
                  " column(s)."
              )
            );
          }

          const jsonData = dataRows.map((row) => {
            const obj = {};
            headers.forEach((col, i) => {
              obj[col] = row[i];
            });
            return obj;
          });

          resolve({
            headers,
            data: jsonData,
          });
        })
        .catch((error) => {
          console.error("Error parsing Excel:", error);
          reject(error);
        });
    } else {
      reject(new Error("Unsupported file type"));
    }
  });
};

export default readCSVAndExcel;
