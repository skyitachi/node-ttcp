package main

import (
	"encoding/binary"
	"fmt"
	"net"
)

type SessionMessage struct {
	Number, Length int32
}

func main() {
	var number int32
	var length int32
	var i int32
	conn, err := net.Dial("tcp", net.JoinHostPort("localhost", "12345"))
	number = 2
	length = 8192 // byte
	if err != nil {
		fmt.Printf(err.Error())
	}
	defer conn.Close()
	sessionMessage := SessionMessage{number, length}
	err = binary.Write(conn, binary.BigEndian, &sessionMessage)
	payload := make([]byte, length + 4)
	binary.BigEndian.PutUint32(payload, uint32(length))
	for i = 0; i < length; i++ {
		payload[4+i] = "0123456789ABCDEF"[i%16]
	}
	for i = 0; i < number; i++ {
		n, e := conn.Write(payload)
		if n == len(payload) {
			fmt.Printf("write payload\n")
		}
		if e != nil {
			fmt.Printf(err.Error())
		}
		var ack int32
		e = binary.Read(conn, binary.BigEndian, &ack)
    fmt.Printf("ack is %d\n", ack)
		if ack != length {
			fmt.Printf("ack error")
		}
	}
}
