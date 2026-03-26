// frontend/src/components/AddCreds.jsx
import React, { useState } from 'react';
import api from '../services/api';
import Icon from './Icon';
import { useSchemaConfig } from '../config/SchemaConfig';
import '../styles/AddCreds.css';

const STEPS = [
  { id: 1, label: 'Validating inputs' },
  { id: 2, label: 'Connecting to database' },
  { id: 3, label: 'Fetching Schema (Tables)' },
  { id: 4, label: 'Mapping Relationships' },
  { id: 5, label: 'Saving Securely' },
];

export default function AddCreds({ onComplete }) {
  const [formData, setFormData] = useState({
    name: '', host: 'localhost', port: '5432', db_name: '', username: 'postgres', password: '', ssl_mode: 'prefer'
  });
  const [step, setStep] = useState(0); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Get the function to update our "Config File"
  const { updateSchemaConfig } = useSchemaConfig();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStep(1);

    try {
      // Step 2: Test
      setStep(2);
      await api.post('/db-connections/test', formData);
      
      // Step 3-5: Save (and Fetch Metadata)
      setStep(3);
      await new Promise(r => setTimeout(r, 400)); // Visual delay
      setStep(4);
      
      const response = await api.post('/db-connections/save', formData);
      const newConnectionId = response.data.id;
      
      setStep(5);
      
      // Fetch the full metadata to put in SchemaConfig
      const metaResponse = await api.get(`/db-connections/${newConnectionId}`);
      
      if (metaResponse.data.schema) {
         // Update the global configuration variable
         updateSchemaConfig(metaResponse.data.schema);
      }

      // CRITICAL FIX: Advance step to 6 so step 5 (Saving Securely) turns into a green checkmark
      setStep(6);

      // Success & Redirect
      setTimeout(() => {
         if (onComplete) onComplete();
      }, 1000);

    } catch (err) {
      const msg = err.response?.data?.detail || "Connection failed.";
      setError(msg);
      setStep(0);
    } finally {
      setLoading(false); 
    }
  };

  return (
    <div className="add-creds-container">
      {/* LEFT: FORM */}
      <div className="card">
        <h3 style={{marginBottom: '1rem', display:'flex', alignItems:'center', gap:'8px'}}>
          <Icon name="Database" /> Add Connection
        </h3>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
             <label>Connection Name</label>
             <input className="input-field" required placeholder="My Production DB" 
               value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={loading} />
          </div>
          <div className="form-row">
            <div><label>Host</label><input className="input-field" required value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} disabled={loading} /></div>
            <div><label>Port</label><input className="input-field" required value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} disabled={loading} /></div>
          </div>
          <div><label>Database Name</label><input className="input-field" required value={formData.db_name} onChange={e => setFormData({...formData, db_name: e.target.value})} disabled={loading} /></div>
          <div className="form-row">
            <div><label>Username</label><input className="input-field" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={loading} /></div>
            <div><label>Password</label><input className="input-field" required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} disabled={loading} /></div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Processing...' : 'Connect & Fetch'}
          </button>
          
          {error && <div className="error-msg" style={{marginTop: '1rem'}}>{error}</div>}
        </form>
      </div>

      {/* RIGHT: TIMELINE */}
      <div className="card" style={{background: '#f8fafc'}}>
         <h4>Status</h4>
         <div className="timeline">
            {STEPS.map(s => {
               let status = 'pending';
               if (step > s.id) status = 'done';
               if (step === s.id) status = error ? 'error' : 'active';
               
               return (
                 <div key={s.id} className={`timeline-item ${status}`}>
                   <div className="step-dot">
                     {status === 'done' ? <Icon name="Check" size={14}/> : s.id}
                   </div>
                   <span>{s.label}</span>
                 </div>
               )
            })}
         </div>
      </div>
    </div>
  );
}