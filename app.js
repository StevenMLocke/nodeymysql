console.time('exec');

var sql = require('mysql');

var config = {};
config.host = 'localhost';
config.user = 'root';
config.connectionLimit = '25';

var pool = sql.createPool(config);

var persons = [];

pool.getConnection(function(error, connection){
    var q = connection.query("SELECT DISTINCT person_id FROM stuff.things ORDER BY person_id ASC;");

    q.on('result', function(r){
        connection.pause();
        id = r.person_id;
        total = 0;
        aVal = 0;
        bVal = 0;
        console.log('total for person: ' + id);
        pool.getConnection(function(err,conn){
            var q2 = conn.query('SELECT `timestamp` FROM stuff.things WHERE person_id like ? ORDER BY `timestamp` ASC;', id);

            q2.on('error', function(err){
                console.log('nested error' + err.message);
            })
            
            q2.on('result', function(row){
                if (!aVal){
                    aVal = row.timestamp;
                }else{
                    bVal = aVal;
                    aVal = row.timestamp;
                    total += diff(aVal, bVal);
                }
            });

            q2.on('end', function(){
                conn.pause();
                console.log('total: ' + total + '\n\n');
                totals = {person_id : id , total : total};
                pool.getConnection(function(err, connection3) {
                    
                    var q3 = connection3.query('INSERT INTO stuff.totals SET ?', totals);

                    q3.on('end', function(){    
                        connection3.release();
                        if (error) throw error;
                        conn.resume();
                    });
                });
                
                conn.release();
                total = 0;
                connection.resume();
            })
        });
    })

    q.on('end', function(){
        connection.release();
        console.timeEnd('exec');
        process.exit();
    })

    if (error){
        console.log('error: ' + error.message);
        connection.release();
    }
});

function addToArr(arr, item,cb){
    arr.push(item);
    cb();
}

function diff(a,b){
    return a- b;
}
function add(a,b){
    return a + b
}