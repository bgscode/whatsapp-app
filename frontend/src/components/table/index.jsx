import React, { useState, useMemo, useEffect } from "react";
import { TableVirtuoso } from "react-virtuoso";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { ArrowDown, ArrowUp, Search } from "lucide-react";

const VirtualTable = ({
  leftJsx = false, // optional JSX element to be placed on the left side of the table title
  data,
  columns, // e.g. [{ id: "name", name: "Name", header: "Name", render?: (value, row) => JSX }]
  config = {
    tableName: "",
    selectable: false,
    fixedHeight: "300px",
    searching: false,
    searchKey: "",
    sortable: false,
    defaultSort: [],
    // uniqueKey: "id" // Provide a unique key if available; otherwise, full objects are used.
  },
  initialSelected = [], // array of initially selected values (either keys or objects)
  onSelectionChange, // optional callback with an array of selected row keys or objects
}) => {
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  // Multi-key sort: an array of { key, direction }
  const [sortCriteria, setSortCriteria] = useState(
    config.sortable && config.defaultSort ? config.defaultSort : []
  );
  // Selected rows state (by unique key if provided, otherwise the full object)
  const [selectedRows, setSelectedRows] = useState(initialSelected);

  // Instead of using an effect to update on initialSelected,
  // we call onSelectionChange in an effect that depends on selectedRows.
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedRows);
    }
  }, [selectedRows, onSelectionChange]);

  // Filter and sort the data based on searchTerm and sortCriteria.
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Searching with multiple search keys
    if (config.searching && searchTerm) {
      filtered = filtered.filter((row) => {
        if (config.searchKey) {
          const searchKeys = config.searchKey.split(",");
          return searchKeys.some((key) =>
            String(row[key]).toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        // If no specific key, search all fields
        return Object.values(row).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Multi-key Sorting
    if (config.sortable && sortCriteria.length > 0) {
      filtered.sort((a, b) => {
        for (let i = 0; i < sortCriteria.length; i++) {
          const { key, direction } = sortCriteria[i];
          const aVal = a[key];
          const bVal = b[key];
          if (aVal === bVal) continue;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          let result;
          if (typeof aVal === "number" && typeof bVal === "number") {
            result = aVal - bVal;
          } else {
            result = String(aVal).localeCompare(String(bVal));
          }
          return direction === "asc" ? result : -result;
        }
        return 0;
      });
    }
    return filtered;
  }, [data, searchTerm, sortCriteria, config]);

  // Get the value to use for selection: if config.uniqueKey is provided and exists, use that;
  // otherwise, use the full row object.
  const getSelectionValue = (row) =>
    config.uniqueKey && row[config.uniqueKey] !== undefined
      ? row[config.uniqueKey]
      : row;

  // Header click handler for sorting.
  const handleHeaderClick = (colId, e) => {
    if (!config.sortable) return;
    if (e.shiftKey) {
      const existingIndex = sortCriteria.findIndex(
        (item) => item.key === colId
      );
      if (existingIndex !== -1) {
        // Toggle sort direction for this column
        const newSortCriteria = [...sortCriteria];
        newSortCriteria[existingIndex].direction =
          newSortCriteria[existingIndex].direction === "asc" ? "desc" : "asc";
        setSortCriteria(newSortCriteria);
      } else {
        // Add new column sort with ascending order
        setSortCriteria([...sortCriteria, { key: colId, direction: "asc" }]);
      }
    } else {
      // Without shift, use only this column for sorting.
      const existing = sortCriteria.find((item) => item.key === colId);
      if (existing && sortCriteria.length === 1) {
        const newDirection = existing.direction === "asc" ? "desc" : "asc";
        setSortCriteria([{ key: colId, direction: newDirection }]);
      } else {
        setSortCriteria([{ key: colId, direction: "asc" }]);
      }
    }
  };

  // Row selection handlers
  const toggleSelectAll = (checked) => {
    if (checked) {
      const allValues = filteredData.map((row) => getSelectionValue(row));
      setSelectedRows(allValues);
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (row) => {
    const selectionValue = getSelectionValue(row);
    let newSelected;
    // If selectionValue is an object, it must match by reference.
    if (selectedRows.includes(selectionValue)) {
      newSelected = selectedRows.filter((val) => val !== selectionValue);
    } else {
      newSelected = [...selectedRows, selectionValue];
    }
    setSelectedRows(newSelected);
  };

  // Render table header. If selectable, add a checkbox column.
  const fixedHeaderContent = () => (
    <tr className="bg-muted">
      {config.selectable && (
        <th className="w-10 p-4 text-left border-b border-gray-200">
          <Checkbox
            type="checkbox"
            checked={
              selectedRows.length === filteredData.length &&
              filteredData.length > 0
            }
            onCheckedChange={(val) => toggleSelectAll(val)}
          />
        </th>
      )}
      {columns.map((col) => {
        const sortItem = sortCriteria.find((item) => item.key === col.id);
        return (
          <th
            key={col.id}
            className="p-4 text-left border-b border-gray-200"
            onClick={(e) => handleHeaderClick(col.id, e)}
            style={{ cursor: config.sortable ? "pointer" : "default" }}
          >
            {col.header || col.name}
            {sortItem && (
              <span>
                {sortItem.direction === "asc" ? (
                  <ArrowUp className="h-4 w-4 inline" />
                ) : (
                  <ArrowDown className="h-4 w-4 inline" />
                )}
                {sortCriteria.length > 1 && (
                  <sup className="ml-1">
                    {sortCriteria.findIndex((item) => item.key === col.id) + 1}
                  </sup>
                )}
              </span>
            )}
          </th>
        );
      })}
    </tr>
  );

  // Render each row. For selectable rows, we use the selection value.
  const itemContent = (index, row) => {
    const selectionValue = getSelectionValue(row);
    return [
      config.selectable && (
        <td key="checkbox" className="w-10 p-4 border-b border-gray-200">
          <Checkbox
            type="checkbox"
            checked={selectedRows.includes(selectionValue)}
            onCheckedChange={() => handleRowSelect(row)}
          />
        </td>
      ),
      ...columns.map((col) => (
        <td
          key={col.id}
          className="p-4 border-b border-gray-200"
          title={row[col.id]}
          style={{ width: col.width || "auto" }}
        >
          <span>
            {col.render
              ? col.render(row[col.id], row)
              : row[col.id]?.length > 30
              ? row[col.id]?.slice(0, 30) + "..."
              : row[col.id]}
          </span>
        </td>
      )),
    ].filter(Boolean);
  };

  return (
    <>
      <div className="w-full flex items-center justify-between my-3 px-2 gap-4">
        {leftJsx && leftJsx}
        {config.tableName && (
          <h1 className="font-medium text-xl">{config.tableName}</h1>
        )}
        {config.searching && (
          <div
            className={`relative ${
              !leftJsx && !config.tableName ? "w-full" : "w-52"
            }`}
          >
            <Search className="absolute left-4 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        )}
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <TableVirtuoso
          className="overflow-y-auto relative
                [&::-webkit-scrollbar]:w-2
                [&::-webkit-scrollbar]:h-2
                [&::-webkit-scrollbar-track]:rounded-full
                [&::-webkit-scrollbar-track]:bg-gray-100
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:bg-gray-300
                dark:[&::-webkit-scrollbar-track]:bg-neutral-700
                dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
          style={{
            minWidth: "100%",
            height: config.fixedHeight || "300px",
          }}
          data={filteredData}
          components={{
            Table: (props) => (
              <table {...props} className="min-w-max w-full border-collapse" />
            ),
            TableHead: (props) => <thead {...props} />,
            TableRow: (props) => (
              <tr {...props} className="border-b border-gray-200" />
            ),
            TableBody: (props) => <tbody {...props} />,
          }}
          fixedHeaderContent={fixedHeaderContent}
          itemContent={itemContent}
        />
      </div>
    </>
  );
};

export default VirtualTable;
