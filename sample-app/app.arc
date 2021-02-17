@app
macro-cognito-user-pool-demo

@http
get /

@static
fingerprint true

@macros
macro-cognito-user-pool

@cognito
MyUserPool
  RecoveryOptions verified_email verified_phone_number
  StandardAttributes email
  CustomAttribute custom:string string 10 30 false
  CustomAttribute custom:number number 0 100 true
  AllowAdminCreateUserOnly
  CustomMessage
