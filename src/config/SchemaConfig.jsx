// frontend/src/config/SchemaConfig.js
import React, { createContext, useContext, useState } from 'react';

// The Context acts as the dynamic configuration file in memory
const SchemaConfigContext = createContext();

export const SchemaConfigProvider = ({ children }) => {
  // This variable holds the schema metadata
  const [schemaConfig, setSchemaConfig] = useState(null);

  // Function to write/update the variable
  const updateSchemaConfig = (newSchema) => {
    console.log("Schema Configuration Updated:", newSchema);
    setSchemaConfig(newSchema);
  };

  return (
    <SchemaConfigContext.Provider value={{ schemaConfig, updateSchemaConfig }}>
      {children}
    </SchemaConfigContext.Provider>
  );
};

// Hook to access the config anywhere
export const useSchemaConfig = () => useContext(SchemaConfigContext);