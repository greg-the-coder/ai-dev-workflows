import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Tab, Box } from '@mui/material';
import { List, Assessment, CheckCircle } from '@mui/icons-material';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs value={location.pathname} onChange={handleChange} centered>
        <Tab 
          icon={<List />} 
          label="All Tasks" 
          value="/tasks" 
          iconPosition="start"
        />
        <Tab 
          icon={<Assessment />} 
          label="Open Tasks Summary" 
          value="/summary/open" 
          iconPosition="start"
        />
        <Tab 
          icon={<CheckCircle />} 
          label="Completed Tasks" 
          value="/summary/completed" 
          iconPosition="start"
        />
      </Tabs>
    </Box>
  );
};

export default Navigation;
