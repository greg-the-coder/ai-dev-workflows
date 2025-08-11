import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import Navigation from './components/Navigation';
import TaskList from './components/TaskList';
import OpenTasksSummary from './components/OpenTasksSummary';
import CompletedTasks from './components/CompletedTasks';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Task Management App
              </Typography>
            </Toolbar>
          </AppBar>
          
          <Navigation />
          
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/tasks" replace />} />
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/summary/open" element={<OpenTasksSummary />} />
              <Route path="/summary/completed" element={<CompletedTasks />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
