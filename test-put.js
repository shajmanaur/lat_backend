const payload = {"name":"shad ","email":"syed@yopmail.com","mobile":"7017798104","region":"AGRA","school":"KENDRIYA VIDYALAYA MADSUDANPUR DEVIDAS BIJNOR"};
fetch('http://localhost:5001/api/v1/coordinators/6', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidXNlcm5hbWUiOiJhZG1pbl9kZW1vIiwicm9sZSI6MiwiaWF0IjoxNzgzMzMzNDI5LCJleHAiOjE3ODM0MTk4Mjl9.7xRxk5-bLuAO6lfN8Entr76vC5L8X9_kZTbu8I6Y_xk'
  },
  body: JSON.stringify(payload)
})
.then(async res => {
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
})
.catch(err => console.error(err));
