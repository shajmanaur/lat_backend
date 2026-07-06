const payload = {"name":"shad","email":"shad@yopmail.com","mobile":"7017798104","region":"1","school":"43"};
fetch('http://localhost:5001/api/v1/coordinators/single', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidXNlcm5hbWUiOiJhZG1pbl9kZW1vIiwicm9sZSI6MiwiaWF0IjoxNzgzMzM1MTYwLCJleHAiOjE3ODM0MjE1NjB9.sYSDO6pakVNMPL6H9WnMQvz3HkRfwO2nDjGQxbRo7eE'
  },
  body: JSON.stringify(payload)
})
.then(async res => {
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
})
.catch(err => console.error(err));
