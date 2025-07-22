// import React from "react";
// import { TableVirtuoso } from "react-virtuoso";

// export const VituralTable = ({
//   data,
//   fixedHeaderContent,
//   itemContent,
//   style = {},
//   ...rest
// }) => {
//   return (
//     <div className="border rounded-lg overflow-x-auto">
//       <TableVirtuoso
//         style={{ minWidth: "100%", height: "300px", ...style }}
//         data={data}
//         components={{
//           Table: (props) => (
//             <table {...props} className="min-w-max w-full border-collapse" />
//           ),
//           TableHead: (props) => <thead {...props} />,
//           TableRow: (props) => (
//             <tr {...props} className="border-b border-gray-200" />
//           ),
//           TableBody: (props) => <tbody {...props} />,
//         }}
//         fixedHeaderContent={fixedHeaderContent}
//         itemContent={itemContent}
//         {...rest}
//       />
//     </div>
//   );
// };

// const headerRenderer = () => (
//   <tr className="bg-muted">
//     <th className="w-10 p-4 text-left border-b border-gray-200">
//       {/* Place for checkbox or any header cell */}
//     </th>
//     <th className="w-48 p-4 text-left border-b border-gray-200">Name</th>
//     <th className="w-40 p-4 text-left border-b border-gray-200">WhatsApp No</th>
//     <th className="w-32 p-4 text-left border-b border-gray-200">Group</th>
//     <th className="w-24 p-4 text-right border-b border-gray-200">Actions</th>
//   </tr>
// );

// const rowRenderer = (index, contact) => {
//   return [
//     <td key="checkbox" className="w-10 p-4 border-b border-gray-200">
//       {/* Checkbox component */}
//     </td>,
//     <td key="name" className="w-48 p-4 border-b border-gray-200 truncate">
//       {contact.name}
//     </td>,
//     <td
//       key="whatsapp_no"
//       className="w-40 p-4 border-b border-gray-200 truncate"
//     >
//       {contact.whatsapp_no}
//     </td>,
//     <td key="group" className="w-32 p-4 border-b border-gray-200">
//       {contact.groupName}
//     </td>,
//     <td key="actions" className="w-24 p-4 border-b border-gray-200 text-right">
//       {/* Action buttons or dropdown */}
//     </td>,
//   ];
// };
